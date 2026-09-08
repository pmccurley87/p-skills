"""Behavioral Git tests; all repositories and remotes are disposable."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'create_handover.py'


class HandoverTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.repo = self.root / 'source'
        self.remote = self.root / 'remote.git'
        self.repo.mkdir()
        self.env = dict(os.environ, GIT_CONFIG_NOSYSTEM='1',
                        GIT_CONFIG_GLOBAL=os.devnull, GIT_TERMINAL_PROMPT='0')
        self.git('init', '-b', 'main')
        self.git('config', 'user.name', 'Fixture')
        self.git('config', 'user.email', 'fixture@example.test')
        self.git('config', 'commit.gpgsign', 'false')
        for name, content in {'app.py': 'value = 1\n', 'notes.txt': 'original\n',
                              'deleted.txt': 'remove me\n', '.gitignore': '.env\n'}.items():
            (self.repo / name).write_text(content)
        self.git('add', '.')
        self.git('commit', '-m', 'initial')
        self.git('init', '--bare', str(self.remote))
        self.git('remote', 'add', 'origin', str(self.remote))
        self.document = self.root / 'handover.md'
        self.document.write_text('# Continue the task\nCheckpoint: {{CHECKPOINT_SHA}}\n'
                                 'Branch: {{HANDOVER_BRANCH}}\nSource: {{SOURCE_HEAD}}\n'
                                 'Remote: {{REMOTE_URL}}\nNext: finish app.py; run unittest.\n')
        self.manifest = self.root / 'files.json'

    def git(self, *args, cwd=None, check=True):
        return subprocess.run(['git', *args], cwd=cwd or self.repo, env=self.env,
                              capture_output=True, check=check).stdout

    def state(self):
        return (self.git('rev-parse', 'HEAD'), self.git('symbolic-ref', 'HEAD'),
                (self.repo / '.git/index').read_bytes(),
                self.git('diff', '--binary'), self.git('diff', '--cached', '--binary'),
                self.git('ls-files', '--others', '--exclude-standard', '-z'))

    def run_helper(self, paths, *extra):
        self.manifest.write_text(json.dumps(paths))
        return subprocess.run([sys.executable, str(SCRIPT), 'create',
                               '--repo', str(self.repo), '--manifest', str(self.manifest),
                               '--document', str(self.document), '--slug', 'unfinished-task',
                               '--remote', 'origin', *extra], env=self.env,
                              capture_output=True, text=True)

    def receipt(self, result):
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return json.loads(result.stdout)

    def test_dirty_transfer_preserves_source_and_recovers_exact_tree(self):
        (self.repo / 'app.py').write_text('value = 2\n')
        self.git('add', 'app.py')
        (self.repo / 'app.py').write_text('value = 3\n')
        (self.repo / 'notes.txt').write_text('unrelated\n')
        (self.repo / 'deleted.txt').unlink()
        (self.repo / 'new test.py').write_text('assert False  # unfinished\n')
        executable = self.repo / 'run.sh'
        executable.write_text('#!/bin/sh\nexit 1\n')
        executable.chmod(0o755)
        (self.repo / '.env').write_text('PASSWORD=private\n')
        before = self.state()
        receipt = self.receipt(self.run_helper(
            ['app.py', 'deleted.txt', 'new test.py', 'run.sh'], '--push'))
        self.assertEqual(self.state(), before)
        self.assertEqual(receipt['status'], 'published')
        destination = self.root / 'destination'
        self.git('clone', '--branch', receipt['branch'], str(self.remote), str(destination))
        self.assertEqual(self.git('rev-parse', 'HEAD', cwd=destination).decode().strip(), receipt['tip'])
        self.assertEqual((destination / 'app.py').read_text(), 'value = 3\n')
        self.assertEqual((destination / 'notes.txt').read_text(), 'original\n')
        self.assertFalse((destination / 'deleted.txt').exists())
        self.assertFalse((destination / '.env').exists())
        self.assertTrue((destination / 'new test.py').exists())
        self.assertTrue(os.access(destination / 'run.sh', os.X_OK))
        self.assertEqual(self.git('rev-parse', 'HEAD^', cwd=destination).decode().strip(), receipt['checkpoint'])
        self.assertIn(receipt['checkpoint'], (destination / receipt['document']).read_text())
        self.assertIn(receipt['tip'], receipt['prompt'])

    def test_push_failure_retains_checkpoint_and_retry_is_idempotent(self):
        self.git('remote', 'set-url', 'origin', str(self.root / 'missing.git'))
        result = self.run_helper(['app.py'], '--push')
        self.assertNotEqual(result.returncode, 0)
        receipt = json.loads(result.stdout)
        self.assertEqual(receipt['status'], 'local_only')
        self.assertEqual(self.git('rev-parse', receipt['branch']).decode().strip(), receipt['tip'])
        self.git('remote', 'set-url', 'origin', str(self.remote))
        args = [sys.executable, str(SCRIPT), 'publish', '--repo', str(self.repo),
                '--remote', 'origin', '--branch', receipt['branch'], '--tip', receipt['tip']]
        for _ in range(2):
            retried = subprocess.run(args, env=self.env, capture_output=True, text=True)
            self.assertEqual(retried.returncode, 0, retried.stdout + retried.stderr)

    def test_receiver_worktree_preserves_existing_dirty_checkout(self):
        receipt = self.receipt(self.run_helper(['app.py'], '--push'))
        existing = self.root / 'existing'
        self.git('clone', '--branch', receipt['branch'], str(self.remote), str(existing))
        (existing / 'app.py').write_text('receiver local work\n')
        self.git('add', 'app.py', cwd=existing)
        (existing / 'app.py').write_text('receiver unstaged work\n')
        before_index = (existing / '.git/index').read_bytes()
        self.git('fetch', str(self.remote), 'refs/heads/' + receipt['branch'], cwd=existing)
        self.assertEqual(self.git('rev-parse', 'FETCH_HEAD', cwd=existing).decode().strip(), receipt['tip'])
        continuation = self.root / 'continuation'
        self.git('worktree', 'add', '-b', 'codex/continue', str(continuation), receipt['tip'], cwd=existing)
        self.assertEqual((existing / '.git/index').read_bytes(), before_index)
        self.assertEqual((existing / 'app.py').read_text(), 'receiver unstaged work\n')
        self.assertEqual((continuation / 'app.py').read_text(), 'value = 1\n')

    def test_existing_remote_branch_is_never_overwritten(self):
        receipt = self.receipt(self.run_helper(['app.py']))
        self.git('push', 'origin', 'HEAD:refs/heads/' + receipt['branch'])
        result = subprocess.run([sys.executable, str(SCRIPT), 'publish', '--repo', str(self.repo),
                                 '--remote', 'origin', '--branch', receipt['branch'],
                                 '--tip', receipt['tip']], env=self.env, capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        remote_tip = self.git('ls-remote', 'origin', 'refs/heads/' + receipt['branch']).split()[0]
        self.assertEqual(remote_tip, self.git('rev-parse', 'HEAD').strip())

    def test_ignored_secret_and_unsafe_paths_are_rejected(self):
        (self.repo / '.env').write_text('SECRET=private\n')
        for paths in [['.env'], ['../handover.md'], ['.git/config'], ['missing.py']]:
            with self.subTest(paths=paths):
                before = self.state()
                result = self.run_helper(paths)
                self.assertNotEqual(result.returncode, 0)
                self.assertEqual(self.state(), before)
        self.assertEqual(self.git('for-each-ref', 'refs/heads/codex/handover'), b'')

    def test_failing_hook_preserves_source(self):
        hook = self.repo / '.git/hooks/pre-commit'
        hook.write_text('#!/bin/sh\nexit 1\n')
        hook.chmod(0o755)
        before = self.state()
        result = self.run_helper(['app.py'], '--push')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.state(), before)
        self.assertEqual(self.git('ls-remote', 'origin', 'refs/heads/*'), b'')

    def test_hook_modification_does_not_publish_changed_tree(self):
        hook = self.repo / '.git/hooks/pre-commit'
        hook.write_text('#!/bin/sh\nprintf changed > app.py\ngit add app.py\n')
        hook.chmod(0o755)
        result = self.run_helper(['app.py'], '--push')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((self.repo / 'app.py').read_text(), 'value = 1\n')
        self.assertEqual(self.git('ls-remote', 'origin', 'refs/heads/*'), b'')

    def test_in_progress_merge_is_rejected(self):
        (self.repo / '.git/MERGE_HEAD').write_bytes(self.git('rev-parse', 'HEAD'))
        result = self.run_helper(['app.py'])
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('progress', result.stderr)

    def test_source_edit_during_hook_prevents_publication(self):
        hook = self.repo / '.git/hooks/pre-commit'
        # This deliberately simulates another editor changing the source during capture.
        hook.write_text('#!/bin/sh\nprintf concurrent > "' + str(self.repo / 'app.py') + '"\n')
        hook.chmod(0o755)
        result = self.run_helper(['app.py'], '--push')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Source changed', result.stderr)
        self.assertEqual(self.git('ls-remote', 'origin', 'refs/heads/*'), b'')

    def test_literal_pathspec_and_symlink_are_preserved(self):
        (self.repo / '[test]*.py').write_text('literal filename\n')
        (self.repo / 'link.py').symlink_to('app.py')
        receipt = self.receipt(self.run_helper(['[test]*.py', 'link.py']))
        self.assertEqual(self.git('show', receipt['tip'] + ':[test]*.py'), b'literal filename\n')
        self.assertEqual(self.git('show', receipt['tip'] + ':link.py'), b'app.py')
        self.assertTrue(self.git('ls-tree', receipt['tip'], 'link.py').startswith(b'120000'))

    def test_staged_deletion_and_rename_transfer(self):
        self.git('rm', 'deleted.txt')
        self.git('mv', 'app.py', 'renamed.py')
        before = self.state()
        receipt = self.receipt(self.run_helper(['deleted.txt', 'app.py', 'renamed.py']))
        self.assertEqual(self.git('ls-tree', receipt['tip'], 'deleted.txt', 'app.py'), b'')
        self.assertEqual(self.git('show', receipt['tip'] + ':renamed.py'), b'value = 1\n')
        self.assertEqual(self.state(), before)

    def test_staged_new_file_deleted_from_worktree_is_not_transferred(self):
        (self.repo / 'gone.py').write_text('staged then deleted\n')
        self.git('add', 'gone.py')
        (self.repo / 'gone.py').unlink()
        before = self.state()
        receipt = self.receipt(self.run_helper(['gone.py']))
        self.assertEqual(self.git('ls-tree', receipt['tip'], 'gone.py'), b'')
        self.assertEqual(self.state(), before)

    def test_sparse_checkout_false_is_supported(self):
        self.git('config', 'core.sparseCheckout', 'false')
        self.receipt(self.run_helper(['app.py']))

    def test_document_credential_is_rejected_without_echoing_value(self):
        secret = 'ghp_' + 'a' * 36
        self.document.write_text('{{CHECKPOINT_SHA}} ' + secret)
        result = self.run_helper(['app.py'])
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn(secret, result.stdout + result.stderr)
        self.assertEqual(self.git('for-each-ref', 'refs/heads/codex/handover'), b'')

    def test_dirty_submodule_is_rejected(self):
        module = self.root / 'module'
        module.mkdir()
        self.git('init', '-b', 'main', cwd=module)
        self.git('config', 'user.name', 'Fixture', cwd=module)
        self.git('config', 'user.email', 'fixture@example.test', cwd=module)
        (module / 'code.py').write_text('original\n')
        self.git('add', '.', cwd=module)
        self.git('commit', '-m', 'module', cwd=module)
        self.git('-c', 'protocol.file.allow=always', 'submodule', 'add', str(module), 'vendor')
        self.git('commit', '-am', 'add module')
        (self.repo / 'vendor/code.py').write_text('dirty\n')
        result = self.run_helper(['app.py'])
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('submodule', result.stderr)

    def test_detached_head_and_empty_manifest_can_be_checkpointed(self):
        self.git('checkout', '--detach')
        receipt = self.receipt(self.run_helper([]))
        self.assertEqual(receipt['status'], 'local_only')
        self.assertEqual(self.git('symbolic-ref', '-q', 'HEAD', check=False), b'')


if __name__ == '__main__':
    unittest.main()
