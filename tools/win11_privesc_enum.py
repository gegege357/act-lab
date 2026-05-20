#!/usr/bin/env python3
"""
Win11 Privesc Enum v1.0
CTF tool untuk privilege escalation enumeration pada Windows 11 via WMI (impacket)
Jalankan dari attack box (Kali/Linux) terhadap target Windows 11.

Usage:
    python3 win11_privesc_enum.py <target> <user> <password> [-d DOMAIN]
    python3 win11_privesc_enum.py <target> -hashes LM:HASH <user>
    python3 win11_privesc_enum.py <target> <user> <password> --output report.txt

Dependencies:
    pip install impacket
"""

import argparse
import subprocess
import sys
import textwrap
from datetime import datetime
from shutil import which

# impacket-wmiexec path (installed via pip)
# We call it via subprocess for reliability
WMIEXEC_PATH = which("wmiexec.py") or which("impacket-wmiexec") or ""
if not WMIEXEC_PATH:
    print("[!] impacket-wmiexec not found in PATH. Install with: pip install impacket")
    print("[!] Tried: wmiexec.py, impacket-wmiexec")
    sys.exit(1)

# ──────────────────────────────────────────────
# Color & Output Utilities
# ──────────────────────────────────────────────
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    MAGENTA = '\033[95m'
    BOLD = '\033[1m'
    DIM = '\033[2m'
    RESET = '\033[0m'
    INFO = f"{BLUE}[*]{RESET}"
    GOOD = f"{GREEN}[+]{RESET}"
    WARN = f"{YELLOW}[!]{RESET}"
    BAD = f"{RED}[x]{RESET}"
    HEAD = f"{CYAN}[#]{RESET}"

def info(msg):
    print(f"  {Colors.INFO} {msg}")

def good(msg):
    print(f"  {Colors.GOOD} {Colors.GREEN}{msg}{Colors.RESET}")

def warn(msg):
    print(f"  {Colors.WARN} {Colors.YELLOW}{msg}{Colors.RESET}")

def bad(msg):
    print(f"  {Colors.BAD} {Colors.RED}{msg}{Colors.RESET}")

def header(msg):
    print(f"\n{Colors.HEAD} {Colors.CYAN}{Colors.BOLD}{msg}{Colors.RESET}")
    print(f"  {Colors.DIM}{'─' * 60}{Colors.RESET}")

def subheader(msg):
    print(f"\n  {Colors.MAGENTA}▸ {msg}{Colors.RESET}")

def print_table(headers, rows):
    """Print aligned table."""
    if not rows:
        return
    col_widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            col_widths[i] = max(col_widths[i], len(str(cell)))
    fmt = "    " + "  ".join(f"{{:<{w}}}" for w in col_widths)
    print(f"    {Colors.DIM}{'─' * (sum(col_widths) + 2 * (len(headers) - 1))}{Colors.RESET}")
    print(f"    {Colors.BOLD}" + fmt.format(*headers) + f"{Colors.RESET}")
    print(f"    {Colors.DIM}{'─' * (sum(col_widths) + 2 * (len(headers) - 1))}{Colors.RESET}")
    for row in rows:
        print(f"    " + fmt.format(*row))


# ──────────────────────────────────────────────
# WMI Executor (via impacket-wmiexec CLI)
# ──────────────────────────────────────────────
class WMIExecutor:
    """Run commands on target Windows via impacket-wmiexec CLI subprocess.
    
    Uses the battle-tested impacket-wmiexec command-line tool instead of
    trying to use impacket's internal Python API incorrectly.
    """

    def __init__(self, target, username, password, domain="", hashes=None):
        self.target = target
        self.username = username
        self.password = password
        self.domain = domain if domain else ""
        self.hashes = hashes
        self.connected = False

    def _build_auth_args(self):
        """Build authentication arguments for impacket-wmiexec."""
        if self.hashes:
            return [
                "-hashes", self.hashes,
                f"{self.domain + '/' if self.domain else ''}{self.username}@{self.target}"
            ]
        else:
            return [
                f"{self.domain + '/' if self.domain else ''}{self.username}:{self.password}@{self.target}"
            ]

    def connect(self):
        """Test connection by running a simple command."""
        test_out = self.run_command("echo CONNECTED")
        if "CONNECTED" in test_out:
            self.connected = True
            return True
        else:
            if test_out:
                bad(f"Connection test failed: {test_out[:100]}")
            return False

    def run_command(self, command, timeout=30):
        """Run a command on the target and return output.
        
        Uses wmiexec.py via subprocess. The tool runs the command
        on the remote Windows target via WMI and returns stdout.
        
        The `-silentcommand` flag reduces banner/status noise from impacket.
        """
        try:
            auth_args = self._build_auth_args()
            
            # Use -silentcommand to suppress banner/status output
            cmd = [WMIEXEC_PATH, "-silentcommand"] + auth_args + [command]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
            )
            
            # impacket-wmiexec outputs status/banner to stderr
            # and actual command output to stdout
            output = result.stdout.strip()
            if not output and result.stderr.strip():
                # If stdout is empty, stderr might have the output
                # (depends on impacket version)
                stderr_lines = result.stderr.strip().split("\n")
                # Only strip clear impacket banner lines, preserve everything else
                filtered = [
                    l for l in stderr_lines 
                    if not any(skip in l for skip in [
                        "Impacket", "WMIEXEC", "wmiexec", 
                        "Type help for", "Type help for",
                    ])
                ]
                # If all lines were banner, return empty
                # Otherwise join all remaining lines
                output = "\n".join(filtered).strip() if filtered else ""
            
            return output
        except subprocess.TimeoutExpired:
            return f"[TIMEOUT] Command timed out after {timeout}s"
        except FileNotFoundError:
            return "[ERROR] wmiexec.py not found at: " + WMIEXEC_PATH
        except Exception as e:
            return f"[ERROR] {e}"

    def run_powershell(self, command, timeout=30):
        """Run PowerShell command on target."""
        import base64
        encoded = base64.b64encode(command.encode("utf-16le")).decode()
        ps_cmd = f"powershell -ExecutionPolicy Bypass -EncodedCommand {encoded}"
        return self.run_command(ps_cmd, timeout)

    def close(self):
        """Clean up — nothing to close with subprocess approach."""
        self.connected = False


# ──────────────────────────────────────────────
# Enumeration Modules
# ──────────────────────────────────────────────
class Windows11PrivescEnum:
    """Main enumeration engine for Windows 11 privilege escalation."""

    def __init__(self, executor):
        self.executor = executor
        self.findings = []  # (type, description, risk: HIGH/MEDIUM/LOW/INFO)
        self.all_output = {}

    def add_finding(self, finding_type, description, risk="INFO"):
        self.findings.append((risk, finding_type, description))

    def run_all(self):
        """Run all enumeration modules."""
        info("Starting Windows 11 Privilege Escalation Enumeration...\n")

        self.enum_system_info()
        self.enum_users()
        self.enum_privileges()
        self.enum_services()
        self.enum_registry()
        self.enum_files()
        self.enum_scheduled_tasks()
        self.enum_processes()
        self.enum_network()
        self.enum_installed_software()
        self.enum_powershell_history()
        self.enum_autologon()
        self.enum_laps()
        self.enum_environment_vars()
        self.enum_appdata()

        self.print_summary()
        self.print_findings()

    # ── System Info ──
    def enum_system_info(self):
        header("SYSTEM INFORMATION")
        cmds = [
            ("Hostname & OS", 'systeminfo | findstr /B /C:"OS Name" /C:"OS Version" /C:"System Type" /C:"Host Name" /C:"Registered Owner"'),
            ("Kernel", 'wmic os get Caption,Version,OSArchitecture /format:csv | findstr /V "Node"'),
            ("Hotfixes", 'wmic qfe get HotFixID,InstalledOn /format:csv | findstr /V "Node"'),
            ("Uptime", 'net statistics workstation | findstr "Statistics since"'),
        ]
        for label, cmd in cmds:
            subheader(label)
            out = self.executor.run_command(cmd)
            self.all_output[f"system_{label.lower().replace(' ','_')}"] = out
            if out:
                for line in out.split("\n")[:15]:
                    print(f"    {line.strip()}")
            else:
                warn("No output")

        # Check if it's Windows 11 specifically
        os_out = self.all_output.get("system_os_name_&_os_version", "").lower()
        if "windows 11" in os_out or "10.0.22" in os_out:
            good("Target: Windows 11 detected")
        elif "windows 10" in os_out or "10.0" in os_out:
            info("Target: Windows 10/11 detected")

    # ── User Enumeration ──
    def enum_users(self):
        header("USER ENUMERATION")
        cmds = [
            ("Current User", 'whoami'),
            ("All Users", 'net user'),
            ("Admin Users", 'net localgroup Administrators'),
            ("User Info", 'whoami /upn 2>nul & whoami /priv 2>nul & whoami /groups 2>nul'),
            ("Logged-in Users", 'query user 2>nul || echo No query command'),
        ]
        for label, cmd in cmds:
            subheader(label)
            out = self.executor.run_command(cmd)
            self.all_output[f"users_{label.lower().replace(' ','_')}"] = out
            if out:
                for line in out.split("\n")[:20]:
                    print(f"    {line.strip()}")

        # Check if current user is admin
        user_out = self.all_output.get("users_current_user", "")
        priv_out = self.all_output.get("users_user_info", "")
        if "nt authority\\system" in user_out.lower():
            good("Running as SYSTEM — full control!")
            self.add_finding("User", "Running as SYSTEM", "INFO")
        elif "administrator" in user_out.lower():
            good("Running as Administrator")
            self.add_finding("User", "Running as Administrator", "INFO")
        else:
            warn("Not running as Administrator — need privesc!")
            self.add_finding("User", "Not running as Administrator — potential privesc needed", "HIGH")

        # Check for interesting users
        users_out = self.all_output.get("users_all_users", "")
        interesting = ["backup", "guest", "svc_", "service", "admin", "test", "user", "sql", "ftp"]
        for u in interesting:
            if u in users_out.lower():
                warn(f"Interesting user found: {u}")
                self.add_finding("User", f"Interesting user: {u}", "MEDIUM")

    # ── Privileges ──
    def enum_privileges(self):
        header("PRIVILEGE CHECKS")
        
        # Check SeImpersonatePrivilege (Juicy Potato etc.)
        priv_out = self.executor.run_command('whoami /priv')
        self.all_output["privs"] = priv_out
        subheader("User Privileges")
        if priv_out:
            for line in priv_out.split("\n"):
                print(f"    {line.strip()}")
        
        dangerous_privs = {
            "SeImpersonatePrivilege": "RoguePotato/JuicyPotato — impersonation attack",
            "SeAssignPrimaryTokenPrivilege": "Token stealing attack",
            "SeCreateTokenPrivilege": "Token creation — full system compromise",
            "SeDebugPrivilege": "Process injection / LSASS dump",
            "SeBackupPrivilege": "Backup files — SAM/SYSTEM dump",
            "SeRestorePrivilege": "Privileged file overwrite",
            "SeTakeOwnershipPrivilege": "Take ownership of files",
            "SeLoadDriverPrivilege": "Load kernel drivers",
            "SeTcbPrivilege": "Act as part of OS — highest privilege"
        }
        
        for priv, desc in dangerous_privs.items():
            if priv not in priv_out:
                continue
            # Parse privilege status from whoami /priv output
            # Format: "Privilege Name                  State" then "SeXxx                       Enabled/Disabled"
            enabled = False
            for line in priv_out.split("\n"):
                if priv in line:
                    enabled = "enabled" in line.lower() and "disabled" not in line.lower()
                    break
            
            if enabled:
                bad(f"DANGEROUS PRIVILEGE ENABLED: {priv} — {desc}")
                self.add_finding("Privilege", f"DANGEROUS PRIVILEGE: {priv} — {desc}", "HIGH")
            else:
                warn(f"Privilege present (disabled): {priv} — {desc}")
                self.add_finding("Privilege", f"Privilege available (disabled): {priv}", "MEDIUM")

    # ── Service Enumeration ──
    def enum_services(self):
        header("SERVICE ENUMERATION")

        # All services with paths
        subheader("Running Services (non-Microsoft)")
        cmd = 'wmic service where "PathName like \"%.exe%\" and not PathName like \"%system32%\" and not PathName like \"%SysWOW64%\"" get Name,PathName,StartName,State /format:csv'
        out = self.executor.run_command(cmd)
        self.all_output["services_non_ms"] = out
        if out:
            for line in out.split("\n")[:30]:
                print(f"    {line.strip()}")
        else:
            info("No non-Microsoft services found or query failed")

        # Unquoted service paths
        subheader("Unquoted Service Paths")
        unq_cmd = 'wmic service get name,displayname,pathname,startmode 2>nul'
        out2 = self.executor.run_command(unq_cmd)
        self.all_output["services_unquoted"] = out2
        if out2:
            for line in out2.split("\n"):
                if " " in line and not line.strip().startswith("Name"):
                    path = line.strip().split('"')[-1] if '"' in line else line
                    if "\\ " in path or (" " in path and len(path.split(" ")) > 1):
                        bad(f"Possibly unquoted path: {line.strip()}")
                        self.add_finding("Service", f"UNQUOTED SERVICE PATH: {line.strip()}", "HIGH")
                    else:
                        print(f"    {line.strip()}")
        else:
            info("No unquoted paths found in non-system32 services (good)")

        # Service permissions (icacls)
        subheader("Service Binary Permissions (writable?)")
        bin_cmd = 'wmic service where "PathName like \"%.exe%\" and not PathName like \"%system32%\"" get PathName /format:csv'
        out3 = self.executor.run_command(bin_cmd)
        self.all_output["service_binaries"] = out3
        if out3:
            for path_line in out3.split("\n")[:15]:
                path_line = path_line.strip().split(",")[-1].strip().strip('"').strip("'")
                if path_line and path_line.endswith(".exe"):
                    icacls = self.executor.run_command(f'icacls "{path_line}"')
                    if icacls:
                        writable = any(x in icacls.lower() for x in ["(f)", "(m)", "(w)", "everyone", "authenticated users", "BUILTIN\\Users:(I)(M)", "BUILTIN\\Users:(I)(W)", ":(OI)(CI)(F)"])
                        if writable:
                            bad(f"WRITABLE SERVICE BINARY: {path_line}")
                            self.add_finding("Service", f"Writable service binary: {path_line}", "HIGH")
                            for ic in icacls.split("\n")[:10]:
                                print(f"    {ic.strip()}")

        # StartMenu services (auto-start)
        subheader("Auto-Start Services")
        auto_cmd = 'wmic startup get Caption,Command /format:csv | findstr /V "Node"'
        out4 = self.executor.run_command(auto_cmd)
        self.all_output["startup"] = out4
        if out4:
            for line in out4.split("\n")[:10]:
                print(f"    {line.strip()}")

    # ── Registry Checks ──
    def enum_registry(self):
        header("REGISTRY CHECKS")

        reg_checks = [
            ("AlwaysInstallElevated (MSI privesc)", 
             'reg query HKCU\\Software\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated 2>nul',
             "AlwaysInstallElevated — MSI privesc possible!", "HIGH"),
            ("AlwaysInstallElevated (HKLM)", 
             'reg query HKLM\\Software\\Policies\\Microsoft\\Windows\\Installer /v AlwaysInstallElevated 2>nul',
             "AlwaysInstallElevated (HKLM) — MSI privesc possible!", "HIGH"),
            ("AutoAdminLogon", 
             'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon" 2>nul',
             "AutoAdminLogon — may contain password!", "HIGH"),
            ("Putty Sessions", 
             'reg query "HKCU\\Software\\SimonTatham\\Putty\\Sessions" /s 2>nul',
             "Putty sessions with saved credentials!", "MEDIUM"),
            ("Saved RDP Credentials", 
             'cmdkey /list 2>nul',
             "Saved credentials found!", "MEDIUM"),
            ("VNC", 
             'reg query "HKCU\\Software\\RealVNC\\vncserver" /s 2>nul || reg query "HKLM\\SOFTWARE\\RealVNC\\vncserver" /s 2>nul || reg query "HKCU\\Software\\TightVNC\\Server" /s 2>nul',
             "VNC credentials exposed!", "MEDIUM"),
            ("Registry AutoRun", 
             'reg query "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run" 2>nul',
             "AutoRun entries — check for writable paths", "LOW"),
        ]

        for label, cmd, finding_msg, risk in reg_checks:
            subheader(label)
            out = self.executor.run_command(cmd)
            self.all_output[f"reg_{label.lower().replace(' ','_')}"] = out
            if out and "ERROR" not in out:
                warn(finding_msg)
                self.add_finding("Registry", finding_msg, risk)
                for line in out.split("\n")[:10]:
                    print(f"    {line.strip()}")
            else:
                info("Not configured (safe)")

    # ── File Enumeration ──
    def enum_files(self):
        header("FILE ENUMERATION")

        file_checks = [
            ("Unattended Install Files", 
             'dir /s /b C:\\Windows\\Panther\\*.xml C:\\Windows\\Panther\\*.inf C:\\Windows\\Panther\\*.txt C:\\Windows\\Setup\\Scripts\\*.xml 2>nul',
             "Unattended install files with passwords!", "HIGH"),
            ("SAM & SYSTEM Backup", 
             'dir /s /b C:\\*.sam C:\\*.sys 2>nul & dir /b C:\\Windows\\Repair\\SAM C:\\Windows\\Repair\\SYSTEM C:\\Windows\\System32\\config\\SAM 2>nul',
             "SAM/SYSTEM backup accessible!", "CRITICAL"),
            ("Web Config Files", 
             'dir /s /b C:\\*web.config C:\\*app.config C:\\*.config 2>nul',
             "Config files with connection strings!", "MEDIUM"),
            ("Password Files", 
             'dir /s /b C:\\*password* C:\\*cred* C:\\*secret* C:\\*key* 2>nul',
             "Files with password/credential keywords found!", "HIGH"),
            ("Cloud Credentials", 
             'dir /s /b C:\\Users\\*\\.aws\\ C:\\Users\\*\\.azure\\ C:\\Users\\*\\AppData\\Roaming\\gcloud\\ 2>nul',
             "Cloud provider credentials found!", "HIGH"),
            ("WSL Files", 
             'dir /a /b C:\\Users\\*\\AppData\\Local\\Packages\\*Canonical*\\LocalState\\rootfs\\ 2>nul & dir /b C:\\Users\\*\\wsl.conf C:\\Users\\*\\.bashrc C:\\Users\\*\\.ssh\\* 2>nul',
             "WSL files with potential Linux credentials!", "MEDIUM"),
            ("SSH Keys", 
             'dir /s /b C:\\Users\\*\\.ssh\\* 2>nul',
             "SSH private keys found!", "HIGH"),
            ("Backup Files", 
             'dir /s /b C:\\*backup* C:\\*bak* C:\\*.old C:\\*.txt 2>nul',
             "Backup files — may contain useful info", "LOW"),
        ]

        for label, cmd, finding_msg, risk in file_checks:
            subheader(label)
            out = self.executor.run_command(cmd)
            self.all_output[f"files_{label.lower().replace(' ','_')}"] = out
            if out and out.strip():
                warn(finding_msg)
                self.add_finding("File", finding_msg, risk)
                for line in out.split("\n")[:10]:
                    print(f"    {line.strip()}")
            else:
                info("No results")

        # Check Everyone writeable folders
        subheader("Writable Folders (Everyone)")
        folders = [
            "C:\\Windows\\Temp",
            "C:\\Temp", 
            "C:\\Users\\Public",
            "C:\\Windows\\System32\\Tasks",
            "C:\\ProgramData",
        ]
        for folder in folders:
            out = self.executor.run_command(f'icacls "{folder}" 2>nul | findstr /i "Everyone BUILTIN\\\\Users"')
            if out:
                for line in out.split("\n"):
                    if any(x in line.lower() for x in ["(f)", "(m)", "(w)", ":(f)", ":(m)", ":(w)"]):
                        bad(f"WRITABLE: {folder} — {line.strip()}")
                        self.add_finding("File", f"Writable folder: {folder} — may allow DLL planting", "HIGH")

        # Alternate Data Streams (ADS) - use powershell for reliability
        subheader("Alternate Data Streams (ADS)")
        ads_dirs = ["C:\\Users\\Public", "C:\\Windows\\Temp"]
        for d in ads_dirs:
            # Use PowerShell to check ADS (more reliable than dir /r across different Windows versions)
            ps_cmd = f'Get-ChildItem -Path "{d}" -Recurse -ErrorAction SilentlyContinue | % {{ Get-Item $_.FullName -Stream * | Where-Object {{ $_.Stream -ne \":\$DATA\" }} }} | Select-Object FileName,Stream,Length | Format-Table -AutoSize'
            out = self.executor.run_powershell(ps_cmd)
            if out and len(out.strip()) > 10:
                warn(f"ADS found in {d}")
                self.add_finding("File", f"Alternate Data Stream in {d}", "MEDIUM")
                for line in out.split("\n")[:5]:
                    print(f"    {line.strip()}")

    # ── Scheduled Tasks ──
    def enum_scheduled_tasks(self):
        header("SCHEDULED TASKS")
        cmds = [
            ("All Tasks", 'schtasks /query /fo LIST /v 2>nul'),
            ("Task Files", 'dir /s /b C:\\Windows\\System32\\Tasks\\ 2>nul'),
        ]
        for label, cmd in cmds:
            subheader(label)
            out = self.executor.run_command(cmd)
            self.all_output[f"tasks_{label.lower().replace(' ','_')}"] = out
            if out:
                lines = out.split("\n")
                # Show only task names initially
                task_names = [l for l in lines if "TaskName:" in l or "Task Name:" in l or l.strip().endswith("\\")]
                for line in lines[:20]:
                    print(f"    {line.strip()}")
                if len(lines) > 20:
                    info(f"... ({len(lines)} total lines, truncated)")
            else:
                info("No tasks found or access denied")

    # ── Process Enumeration ──
    def enum_processes(self):
        header("PROCESS ENUMERATION")
        
        subheader("Interesting Processes")
        proc_cmd = 'wmic process where "not Name like \'%svchost%\' and not Name like \'%system%\' and not Name like \'%runtime%\' and not Name like \'%conhost%\' and not Name like \'%csrss%\' and not Name like \'%winlogon%\' and not Name like \'%lsass%\' and not Name like \'%services%\' and not Name like \'%spoolsv%\'" get Name,ProcessId,CommandLine /format:csv 2>nul | findstr /V "Node"'
        out = self.executor.run_command(proc_cmd)
        self.all_output["processes"] = out
        if out:
            for line in out.split("\n")[:20]:
                if line.strip():
                    print(f"    {line.strip()}")
        
        # Check for AV/EDR
        subheader("Security Products")
        av_cmd = 'wmic /namespace:\\\\root\\securitycenter2 path antivirusproduct get displayName,productState /format:csv 2>nul | findstr /V "Node"'
        out2 = self.executor.run_command(av_cmd)
        if out2:
            print(f"    {out2.strip()}")
        else:
            info("No AV detected (or access denied)")

    # ── Network ──
    def enum_network(self):
        header("NETWORK INFORMATION")
        cmds = [
            ("IP Config", 'ipconfig /all'),
            ("ARP Table", 'arp -a'),
            ("Routing Table", 'route print'),
            ("Active Connections", 'netstat -ano'),
            ("Shares", 'net share'),
            ("Domain Info", 'net view /domain 2>nul || echo Not in domain'),
        ]
        for label, cmd in cmds:
            subheader(label)
            out = self.executor.run_command(cmd)
            self.all_output[f"net_{label.lower().replace(' ','_')}"] = out
            if out:
                lines = out.split("\n")
                for line in lines[:15]:
                    print(f"    {line.strip()}")
                if len(lines) > 15:
                    info(f"... ({len(lines)} total lines)")

        # Check network service accounts
        subheader("Network Service Accounts")
        nsout = self.executor.run_command('net localgroup "Remote Desktop Users" 2>nul')
        if nsout:
            print(f"    {nsout.strip()[:200]}")

    # ── Installed Software ──
    def enum_installed_software(self):
        header("INSTALLED SOFTWARE")
        cmds = [
            ("Installed Programs", 'wmic product get Name,Version,Vendor /format:csv 2>nul | findstr /V "Node"'),
            ("Patch Level", 'wmic qfe get HotFixID,InstalledOn /format:csv 2>nul | findstr /V "Node"'),
        ]
        for label, cmd in cmds:
            subheader(label)
            out = self.executor.run_command(cmd)
            self.all_output[f"software_{label.lower().replace(' ','_')}"] = out
            if out:
                # Look for vulnerable software
                vuln_keywords = ["wamp", "xampp", "filezilla", "teamviewer", "anydesk", "vmware", 
                                 "virtualbox", "docker", "chrome", "firefox", "sublime", "notepad++",
                                 "python", "node.js", "php", "mysql", "apache", "nginx"]
                found_vulns = []
                for line in out.split("\n"):
                    for kw in vuln_keywords:
                        if kw in line.lower():
                            found_vulns.append(line.strip())
                for line in found_vulns[:15]:
                    print(f"    {line}")
                if not found_vulns:
                    for line in out.split("\n")[:15]:
                        print(f"    {line.strip()}")
            else:
                info("No results or access denied")

    # ── PowerShell History ──
    def enum_powershell_history(self):
        header("POWERSHELL HISTORY & TRANSCRIPTS")
        
        ps_locs = [
            'C:\\Users\\*\\AppData\\Roaming\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt',
            'C:\\Users\\*\\AppData\\Roaming\\Microsoft\\PowerShell\\*transcript*',
        ]
        
        subheader("PSReadLine History")
        out = self.executor.run_command('dir /s /b C:\\Users\\*\\AppData\\Roaming\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt 2>nul')
        if out:
            for hist_file in out.split("\n")[:3]:
                if hist_file.strip():
                    content = self.executor.run_command(f'type "{hist_file.strip()}" 2>nul')
                    if content:
                        warn(f"PowerShell history found: {hist_file.strip()}")
                        self.add_finding("PowerShell", f"PS history: {hist_file.strip()}", "MEDIUM")
                        for line in content.split("\n")[:20]:
                            print(f"    {line.strip()}")
        else:
            info("No PS history found")

    # ── AutoLogon ──
    def enum_autologon(self):
        header("AUTOLOGON CREDENTIALS")
        out = self.executor.run_command('reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon" /v DefaultUserName 2>nul & reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon" /v DefaultPassword 2>nul')
        self.all_output["autologon"] = out
        if out and "DefaultPassword" in out:
            bad("AUTOLOGON PASSWORD FOUND!")
            self.add_finding("Credentials", "AutoLogon credentials exposed in registry!", "HIGH")
            for line in out.split("\n"):
                print(f"    {line.strip()}")
        else:
            info("No autologon configured")

    # ── LAPS ──
    def enum_laps(self):
        header("LAPS (Local Administrator Password Solution)")
        out = self.executor.run_command('reg query "HKLM\\Software\\Policies\\Microsoft Services\\AdmPwd" /v AdmPwdEnabled 2>nul & reg query "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\LAPS" 2>nul')
        self.all_output["laps"] = out
        if out and ("AdmPwdEnabled" in out or "LAPS" in out):
            warn("LAPS configured — check if you can read passwords!")
            self.add_finding("Credentials", "LAPS configured — potential admin password read", "MEDIUM")
            print(f"    {out.strip()}")
        else:
            info("LAPS not configured")

    # ── Environment Variables ──
    def enum_environment_vars(self):
        header("ENVIRONMENT VARIABLES")
        out = self.executor.run_command('set')
        self.all_output["env_vars"] = out
        if out:
            sensitive_vars = ["password", "secret", "key", "token", "cred", "api", "admin", "passwd"]
            for var_line in out.split("\n"):
                var_lower = var_line.lower()
                for sv in sensitive_vars:
                    if sv in var_lower and "=" in var_line:
                        warn(f"Sensitive env var: {var_line.strip()}")
                        self.add_finding("EnvVar", f"Sensitive environment variable: {var_line.strip()}", "HIGH")
                        break
            # Show all env
            for line in out.split("\n")[:30]:
                print(f"    {line.strip()}")

    # ── AppData Roaming ──
    def enum_appdata(self):
        header("APPDATA ROAMING CHECKS")
        check_cmds = [
            ("Browser Data", 'dir /s /b C:\\Users\\*\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Login* C:\\Users\\*\\AppData\\Roaming\\Mozilla\\Firefox\\Profiles\\*\\logins.json 2>nul'),
            ("WinSCP", 'dir /s /b C:\\Users\\*\\AppData\\Roaming\\WinSCP.ini 2>nul'),
            ("FileZilla", 'dir /s /b C:\\Users\\*\\AppData\\Roaming\\FileZilla\\*.xml 2>nul'),
            ("VPN Clients", 'dir /s /b C:\\Users\\*\\AppData\\Roaming\\OpenVPN\\* 2>nul'),
            ("SSH Config", 'dir /s /b C:\\Users\\*\\.ssh\\* 2>nul'),
        ]
        for label, cmd in check_cmds:
            subheader(label)
            out = self.executor.run_command(cmd)
            if out and out.strip():
                warn(f"Found: {out.strip()[:200]}")
                self.add_finding("AppData", f"Found: {label} — potential credentials", "MEDIUM")
                for line in out.split("\n")[:5]:
                    print(f"    {line.strip()}")
            else:
                info("No results")

    # ── Summary ──
    def print_summary(self):
        header("ENUMERATION COMPLETE")
        risk_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
        for risk, ftype, desc in self.findings:
            if risk in risk_counts:
                risk_counts[risk] += 1

        print(f"\n  {Colors.BOLD}Findings Summary:{Colors.RESET}")
        print(f"    {Colors.RED}  Critical: {risk_counts['CRITICAL']}{Colors.RESET}")
        print(f"    {Colors.YELLOW}  High:     {risk_counts['HIGH']}{Colors.RESET}")
        print(f"    {Colors.MAGENTA}  Medium:   {risk_counts['MEDIUM']}{Colors.RESET}")
        print(f"    {Colors.BLUE}  Low:      {risk_counts['LOW']}{Colors.RESET}")
        print(f"    {Colors.DIM}  Info:     {risk_counts['INFO']}{Colors.RESET}")

    def print_findings(self):
        if not self.findings:
            info("No findings to report.")
            return

        header("ALL FINDINGS")
        risk_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4}
        sorted_findings = sorted(self.findings, key=lambda x: risk_order.get(x[0], 99))

        colors = {
            "CRITICAL": Colors.RED + Colors.BOLD,
            "HIGH": Colors.RED,
            "MEDIUM": Colors.YELLOW,
            "LOW": Colors.BLUE,
            "INFO": Colors.DIM,
        }
        for risk, ftype, desc in sorted_findings:
            c = colors.get(risk, Colors.RESET)
            print(f"  [{c}{risk:8}{Colors.RESET}] [{Colors.CYAN}{ftype:12}{Colors.RESET}] {desc}")


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────
def banner():
    print(f"""
{Colors.CYAN}{Colors.BOLD}
    ╔══════════════════════════════════════════╗
    ║     Win11 Privesc Enum v1.0             ║
    ║    Windows 11 CTF Privesc Enumeration   ║
    ╚══════════════════════════════════════════╝
{Colors.RESET}
{Colors.DIM}    [+] Target: Windows 11
    [+] Method: WMI (impacket)
    [+] Focus: Privilege Escalation
{Colors.RESET}
{Colors.YELLOW}    [!] For educational/CTF purposes only{Colors.RESET}
""")

def main():
    parser = argparse.ArgumentParser(
        description="Win11 Privesc Enum — Windows 11 CTF Privilege Escalation Enumeration Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            Examples:
              python3 %(prog)s 192.168.1.100 administrator Passw0rd!
              python3 %(prog)s 192.168.1.100 -hashes :aad3b435b51404eeaad3b435b51404ee user
              python3 %(prog)s 192.168.1.100 administrator Passw0rd! -d WORKGROUP
              python3 %(prog)s 192.168.1.100 administrator Passw0rd! --output report.txt
        """))
    parser.add_argument("target", help="Target IP address")
    parser.add_argument("username", help="Username")
    parser.add_argument("password", nargs="?", default="", help="Password")
    parser.add_argument("-d", "--domain", default="", help="Domain (default: WORKGROUP)")
    parser.add_argument("--hashes", help="LM:NT hashes for pass-the-hash")
    parser.add_argument("--output", help="Save output to file")
    parser.add_argument("--no-banner", action="store_true", help="Skip banner")
    
    if len(sys.argv) < 2:
        parser.print_help()
        sys.exit(1)

    args = parser.parse_args()

    if not args.no_banner:
        banner()

    if args.hashes and not args.password:
        args.password = ""

    info(f"Connecting to {Colors.BOLD}{args.target}{Colors.RESET} as {Colors.BOLD}{args.username}{Colors.RESET}...")
    if args.hashes:
        info(f"Using Pass-the-Hash: {args.hashes}")

    executor = WMIExecutor(
        target=args.target,
        username=args.username,
        password=args.password,
        domain=args.domain,
        hashes=args.hashes,
    )

    if not executor.connect():
        bad("Connection failed. Check credentials, target, and network.")
        info("Troubleshooting:")
        info("  - Is the target reachable? (ping)")
        info("  - Is port 445 (SMB) open?")
        info("  - Are credentials correct?")
        info("  - Is Windows Firewall blocking WMI?")
        sys.exit(1)

    good(f"Connected to {args.target}")
    
    # Start enumeration
    enum = Windows11PrivescEnum(executor)
    
    try:
        enum.run_all()
    except KeyboardInterrupt:
        warn("\nInterrupted by user")
    except Exception as e:
        bad(f"Enumeration error: {e}")
        import traceback
        print(f"    {traceback.format_exc()}")
    finally:
        executor.close()

    # Save output
    if args.output:
        try:
            with open(args.output, "w") as f:
                f.write(f"Win11 Privesc Enum Report\n")
                f.write(f"Target: {args.target}\n")
                f.write(f"Time: {datetime.now()}\n")
                f.write(f"{'='*60}\n\n")
                for section, data in enum.all_output.items():
                    f.write(f"\n[ {section.upper()} ]\n")
                    f.write(f"{'-'*40}\n")
                    f.write(f"{data}\n")
                f.write(f"\n{'='*60}\n")
                f.write("FINDINGS:\n")
                for risk, ftype, desc in enum.findings:
                    f.write(f"[{risk}] [{ftype}] {desc}\n")
            good(f"Report saved to {args.output}")
        except Exception as e:
            bad(f"Failed to save report: {e}")

    good("Enumeration complete!")


if __name__ == "__main__":
    main()
