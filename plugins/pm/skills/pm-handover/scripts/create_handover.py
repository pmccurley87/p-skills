#!/usr/bin/env python3
"""Publish a reviewed, path-scoped Git checkpoint without changing the source checkout."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import tempfile
from urllib.parse import quote, urlsplit, urlunsplit
import uuid


class HandoverError(Exception):
    pass


ENV = dict(os.environ, GIT_OPTIONAL_LOCKS='0', GIT_TERMINAL_PROMPT='0')
# A caller's Git routing overrides must not redirect operations into another index/repo.
for _key in ('GIT_INDEX_FILE', 'GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR',
             'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES'):
    ENV.pop(_key, None)


def git(repo, *args, env=None, check=True):
    result = subprocess.run(['git', *args], cwd=repo, env=env or ENV,
                            capture_output=True)
    if check and result.returncode:
        # Git/hook stderr may contain remote credentials or arbitrary secret values.
        raise HandoverError('Git ' + args[0] + ' failed (exit ' + str(result.returncode)
                            + '). Inspect authentication, repository state, or hooks locally; '
                            'raw output is withheld to avoid leaking credentials.')
    return result


def out(repo, *args, env=None):
    return git(repo, *args, env=env).stdout.decode().strip()


def safe_url(raw):
    if any(ord(c) < 32 for c in raw):
        raise HandoverError('Remote URL contains control characters.')
    if '://' in raw:
        parsed = urlsplit(raw)
        if parsed.scheme in ('http', 'https', 'ssh'):
            host = parsed.hostname or ''
            if ':' in host:
                host = '[' + host + ']'
            if parsed.port:
                host += ':' + str(parsed.port)
            if parsed.scheme == 'ssh' and parsed.username:
                host = parsed.username + '@' + host
            return urlunsplit((parsed.scheme, host, parsed.path, '', ''))
    return raw


def remote_url(repo, remote):
    if remote not in out(repo, 'remote').splitlines():
        raise HandoverError('Select an existing named Git remote.')
    urls = out(repo, 'remote', 'get-url', '--push', '--all', remote).splitlines()
    if len(urls) != 1:
        raise HandoverError('Remote must have exactly one push destination.')
    return urls[0]


def valid_path(name):
    if not isinstance(name, str) or not name or '\\' in name or ':' in name:
        raise HandoverError('Manifest paths must be portable repository-relative file paths.')
    path = PurePosixPath(name)
    if path.is_absolute() or any(p in ('..', '.') or p.lower() == '.git' for p in path.parts):
        raise HandoverError('Unsafe repository path: ' + name)
    if str(path) != name or any(ord(c) < 32 for c in name):
        raise HandoverError('Non-canonical repository path.')
    return path


def check_secret(name, data):
    leaf = PurePosixPath(name).name.lower()
    if (leaf == '.env' or (leaf.startswith('.env.') and leaf not in
                          ('.env.example', '.env.sample', '.env.template'))
            or leaf in ('id_rsa', 'id_ed25519', 'credentials.json')
            or leaf.endswith(('.p12', '.pfx', '.key'))):
        raise HandoverError('Credential-like file excluded: ' + name)
    if re.search(rb'-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----|'
                 rb'gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|'
                 rb'https?://[^\s/@]+:[^\s/@]+@', data):
        raise HandoverError('Possible credential material in ' + name + '; review locally.')


def fingerprint(repo, paths):
    index = Path(out(repo, 'rev-parse', '--path-format=absolute', '--git-path', 'index'))
    digest = hashlib.sha256(index.read_bytes() if index.exists() else b'')
    digest.update(git(repo, 'rev-parse', 'HEAD').stdout)
    digest.update(git(repo, 'symbolic-ref', '-q', 'HEAD', check=False).stdout)
    for name in paths:
        file = repo / name
        digest.update(name.encode())
        if file.is_symlink():
            digest.update(b'link' + os.readlink(file).encode())
        elif file.is_file():
            digest.update(str(file.stat().st_mode).encode())
            digest.update(file.read_bytes())
        elif file.exists():
            raise HandoverError('Manifest accepts files, not directories: ' + name)
        else:
            digest.update(b'deleted')
    return digest.digest()


def preflight(repo, paths):
    for marker in ('MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD',
                   'rebase-merge', 'rebase-apply', 'sequencer', 'BISECT_START'):
        if Path(out(repo, 'rev-parse', '--path-format=absolute', '--git-path', marker)).exists():
            raise HandoverError('Git operation in progress: ' + marker)
    if git(repo, 'ls-files', '-u').stdout:
        raise HandoverError('Resolve index conflicts before handover.')
    if git(repo, 'config', '--bool', '--get', 'core.sparseCheckout',
           check=False).stdout.strip() == b'true':
        raise HandoverError('Use a full checkout for capture; sparse checkout is unsupported.')
    modules = git(repo, 'submodule', 'status', '--recursive').stdout
    if any(line[:1] in (b'-', b'+', b'U') for line in modules.splitlines()):
        raise HandoverError('Initialize submodules at their recorded commits before handover.')
    dirty = git(repo, 'submodule', 'foreach', '--quiet', '--recursive',
                'git status --porcelain --untracked-files=normal').stdout
    if dirty.strip():
        raise HandoverError('Dirty submodule work must be published separately first.')
    for name in paths:
        valid_path(name)
        file = repo / name
        for parent in PurePosixPath(name).parents:
            if (repo / str(parent)).is_symlink():
                raise HandoverError('Path traverses a symlink: ' + name)
        if file.is_dir():
            raise HandoverError('List individual files in the manifest: ' + name)
        if git(repo, 'check-ignore', '-q', '--', name, check=False).returncode == 0:
            raise HandoverError('Ignored file excluded: ' + name)
        tracked = git(repo, 'ls-files', '--error-unmatch', '--', ':(literal)' + name,
                      check=False).returncode == 0
        in_head = bool(git(repo, 'ls-tree', '-r', '--name-only', 'HEAD', '--',
                           ':(literal)' + name).stdout)
        if not file.exists() and not file.is_symlink() and not (tracked or in_head):
            raise HandoverError('Manifest file is missing and untracked: ' + name)
        if file.is_file() and not file.is_symlink():
            check_secret(name, file.read_bytes())


def verified_commit(work, tree, message):
    git(work, 'commit', '--allow-empty', '-m', message)
    if out(work, 'rev-parse', 'HEAD^{tree}') != tree or git(
            work, 'status', '--porcelain', '--untracked-files=all').stdout:
        raise HandoverError('Commit hooks changed the checkpoint; source is intact. '
                            'Resolve hook requirements before retrying.')
    return out(work, 'rev-parse', 'HEAD')


def remote_tip(repo, url, ref):
    data = git(repo, 'ls-remote', '--refs', url, ref).stdout.decode().splitlines()
    matches = [line.split()[0] for line in data if line.split()[1] == ref]
    return matches[0] if matches else None


def publish(repo, remote, branch, tip):
    ref = 'refs/heads/' + branch
    if not branch.startswith('codex/handover/') or git(
            repo, 'check-ref-format', ref, check=False).returncode:
        raise HandoverError('Expected a valid codex/handover/ branch.')
    if not re.fullmatch(r'[0-9a-f]{40}|[0-9a-f]{64}', tip):
        raise HandoverError('Expected the full checkpoint tip SHA.')
    if out(repo, 'rev-parse', ref) != tip:
        raise HandoverError('Local branch changed; inspect it before publishing.')
    url = remote_url(repo, remote)
    existing = remote_tip(repo, url, ref)
    if existing == tip:
        return
    if existing:
        raise HandoverError('Remote branch already exists with another tip; never overwritten.')
    # Empty expected value is a create-only compare-and-swap, not permission to overwrite.
    # Use the named remote so pre-push hooks (including Git LFS) get its configured identity.
    result = git(repo, 'push', '--force-with-lease=' + ref + ':', remote,
                 tip + ':' + ref, check=False)
    if remote_tip(repo, url, ref) != tip:
        raise HandoverError('Push not verified (exit ' + str(result.returncode)
                            + '); local checkpoint retained. Check access/network/hooks and retry.')


def prompt(url, branch, tip, document):
    # Double quotes work for these literal examples in both POSIX shells and PowerShell;
    # reject shell-active URL characters rather than emitting an unsafe command.
    portable = not any(c in url for c in ('"', '`', '$', '\n', '\r', '\\'))
    lines = [f'Continue the unfinished task in repository {url}.',
             f'Handover branch: {branch}', f'Expected final commit: {tip}',
             f'Read {document} and applicable repository instructions before continuing.',
             'Use existing Git credentials first; configure access only if it fails.',
             'Preserve existing destination work. Choose a new destination directory.', '']
    if portable:
        lines += ['Fresh clone:', f'git clone --branch {branch} --single-branch "{url}" handover-task',
                  'cd handover-task', 'git rev-parse HEAD',
                  f'Compare the output with {tip}; stop if different.',
                  f'git switch -c codex/continue-{branch.rsplit("/", 1)[1]} {tip}', '',
                  'Existing checkout (first verify its repository identity):',
                  f'git fetch "{url}" refs/heads/{branch}', 'git rev-parse FETCH_HEAD',
                  f'Compare the output with {tip}; stop if different.',
                  f'git worktree add -b codex/continue-{branch.rsplit("/", 1)[1]} ../handover-task {tip}', '']
    else:
        lines += ['Use argument-array Git calls to clone/fetch this URL, verify the expected SHA,',
                  'then create a fresh worktree at that SHA. Do not interpolate this URL into a shell.', '']
    lines += ['Use unique directory/continuation branch names if those names already exist.',
              'Recreate the documented environment; reproduce recorded checks and perform the first',
              'unfinished step. Report missing prerequisites precisely. Commit further work on the',
              'continuation branch; do not merge, deploy, or overwrite the handover branch implicitly.']
    return '\n'.join(lines)


def create(args):
    repo = Path(out(Path(args.repo).resolve(), 'rev-parse', '--show-toplevel'))
    paths = json.loads(Path(args.manifest).read_text())
    if not isinstance(paths, list) or any(not isinstance(p, str) for p in paths):
        raise HandoverError('Manifest must be a JSON array of repository-relative file paths.')
    paths = sorted(set(paths))
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', args.slug) or len(args.slug) > 60:
        raise HandoverError('Slug must be lowercase words separated by hyphens, at most 60 characters.')
    raw_url = remote_url(repo, args.remote)
    url = safe_url(raw_url)
    document = Path(args.document).read_text()
    if '{{CHECKPOINT_SHA}}' not in document:
        raise HandoverError('Document must contain {{CHECKPOINT_SHA}}.')
    check_secret('handover document', document.encode())
    preflight(repo, paths)
    before = fingerprint(repo, paths)
    head = out(repo, 'rev-parse', 'HEAD')
    source_branch = git(repo, 'symbolic-ref', '--short', '-q', 'HEAD', check=False).stdout.decode().strip()
    identity = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8]
    branch = 'codex/handover/' + args.slug + '-' + identity
    doc_path = 'docs/handovers/' + identity + '-' + args.slug + '.md'
    ref = 'refs/heads/' + branch
    with tempfile.TemporaryDirectory(prefix='pm-handover-') as tmp:
        index_env = dict(ENV, GIT_INDEX_FILE=str(Path(tmp) / 'index'))
        git(repo, 'read-tree', head, env=index_env)
        for name in paths:
            file = repo / name
            if not file.exists() and not file.is_symlink():
                # A staged addition subsequently deleted is absent from both HEAD
                # and the desired snapshot. Removing it is an idempotent operation.
                git(repo, 'update-index', '--force-remove', '--', name, env=index_env)
                continue
            git(repo, 'add', '-A', '--', ':(literal)' + name, env=index_env)
        tree = out(repo, 'write-tree', env=index_env)
        if fingerprint(repo, paths) != before:
            raise HandoverError('Source changed during capture; pause edits and retry.')
        work = Path(tmp) / 'work'
        git(repo, 'worktree', 'add', '--detach', str(work), head)
        try:
            git(work, 'read-tree', '--reset', '-u', tree)
            checkpoint = verified_commit(work, tree, 'Checkpoint unfinished task: ' + args.slug)
            replacements = {'CHECKPOINT_SHA': checkpoint, 'HANDOVER_BRANCH': branch,
                            'SOURCE_HEAD': head, 'SOURCE_BRANCH': source_branch or '(detached HEAD)',
                            'REMOTE_URL': url, 'DOCUMENT_PATH': doc_path}
            for key, value in replacements.items():
                document = document.replace('{{' + key + '}}', value)
            if re.search(r'\{\{[A-Z_]+\}\}', document):
                raise HandoverError('Document contains unresolved helper placeholders.')
            check_secret('handover document', document.encode())
            destination = work / doc_path
            for parent in destination.parents:
                if parent == work:
                    break
                if parent.is_symlink():
                    raise HandoverError('Handover document directory traverses a symlink.')
            if destination.exists() or destination.is_symlink():
                raise HandoverError('Handover document path already exists.')
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(document)
            git(work, 'add', '--', doc_path)
            doc_tree = out(work, 'write-tree')
            tip = verified_commit(work, doc_tree, 'Add handover instructions: ' + args.slug)
            if fingerprint(repo, paths) != before:
                raise HandoverError('Source changed during capture; pause edits and retry.')
            git(repo, 'update-ref', ref, tip, '0' * len(tip))
        finally:
            git(repo, 'worktree', 'remove', '--force', str(work))
    receipt = {'status': 'local_only', 'remote': args.remote, 'repository': url,
               'source_branch': source_branch or None, 'source_head': head,
               'branch': branch, 'checkpoint': checkpoint, 'tip': tip,
               'document': doc_path, 'prompt': prompt(url, branch, tip, doc_path),
               'retry_argv': [sys.executable, str(Path(__file__).resolve()), 'publish',
                              '--repo', str(repo), '--remote', args.remote,
                              '--branch', branch, '--tip', tip]}
    # A generic Git locator is always available; hosted links are deliberately host-specific.
    web_url = url
    if url.startswith('git@github.com:'):
        web_url = 'https://github.com/' + url.split(':', 1)[1]
    if web_url.startswith('https://github.com/'):
        base = web_url.removesuffix('.git')
        receipt['branch_url'] = base + '/tree/' + quote(branch, safe='')
        receipt['document_url'] = base + '/blob/' + tip + '/' + quote(doc_path)
    if args.push:
        try:
            publish(repo, args.remote, branch, tip)
            receipt['status'] = 'published'
        except HandoverError as exc:
            receipt['error'] = str(exc)
            print(json.dumps(receipt, indent=2))
            return 1
    print(json.dumps(receipt, indent=2))
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    capture = sub.add_parser('create', help='Capture reviewed files and context; optionally publish.')
    capture.add_argument('--repo', required=True)
    capture.add_argument('--remote', required=True, help='Existing named remote with one push URL.')
    capture.add_argument('--manifest', required=True, help='JSON array of explicit relative file paths; [] for clean task.')
    capture.add_argument('--document', required=True, help='Completed Markdown with {{CHECKPOINT_SHA}} token.')
    capture.add_argument('--slug', required=True)
    capture.add_argument('--push', action='store_true', help='Publish to the authorized remote and verify the tip.')
    retry = sub.add_parser('publish', help='Retry publication of an existing checkpoint; never replace another tip.')
    for name in ('repo', 'remote', 'branch', 'tip'):
        retry.add_argument('--' + name, required=True)
    args = parser.parse_args()
    try:
        if args.command == 'create':
            return create(args)
        publish(Path(args.repo).resolve(), args.remote, args.branch, args.tip)
        print(json.dumps({'status': 'published', 'branch': args.branch, 'tip': args.tip}))
        return 0
    except (HandoverError, OSError, ValueError) as exc:
        message = str(exc) if isinstance(exc, HandoverError) else type(exc).__name__ + ': check local input files/configuration.'
        print(message, file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
