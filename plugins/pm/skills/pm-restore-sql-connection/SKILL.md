---
name: pm-restore-sql-connection
description: Use when Patrick asks to whitelist his public IP for ClaimIt SQL or restore ClaimIt SQL access after an IP change.
---

# Restore ClaimIt SQL access

Read `~/.config/p-skills/pm-restore-sql-connection.json` for the Azure subscription, resource group, VM, network security group, and TCP port. If the file is missing, get those values from the user before changing Azure. The firewall belongs to the SQL VM's network, not an Azure managed database.

1. Get Patrick's current public IPv4 from his machine with `curl -4fsS --max-time 10 https://api.ipify.org`. If the shell runs elsewhere, get Patrick's IP before changing Azure.
2. Use Azure CLI with the configured subscription. Find the VM's private and public IPs. Confirm that the configured network security group applies to the VM or its subnet. Check for an existing rule that allows the current IP to reach the configured port.
3. If needed, use `az network nsg rule create` to add an inbound TCP allow rule. Set the source to the current public IPv4 with `/32` and the destination to the VM's private IPv4 with `/32`. Use the configured destination port, a unique `Patrick_YYYY_MM_DD` name, and a free priority before any matching deny rule. Preserve existing rules.
4. Read the rule back and check that Azure reports `Succeeded`. From Patrick's machine, test the TCP port on the VM's public IP. Report whether the port is reachable.
