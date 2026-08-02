import os
import sys
import subprocess
from pathlib import Path

def main():
    os.environ["PYTHONIOENCODING"] = "utf-8"
    cache_dir = os.environ.get("GENVMROOT")
    if not cache_dir:
        local_app_data = os.environ.get("LOCALAPPDATA")
        cache_base = Path(local_app_data) / "GenLayer" if local_app_data else Path.home() / ".cache"
        cache_dir = str(cache_base / "genvmroot" / "retraction-dependency")
        os.environ["GENVMROOT"] = cache_dir

    if not os.path.exists(cache_dir):
        print(f"Setting up GenVM linter assets at {cache_dir}...")
        subprocess.run(["genvm-lint", "setup"], check=True)

    contract_path = str(Path(__file__).parent.parent / "contracts" / "retraction_dependency.py")
    print(f"Running genvm-lint check on {contract_path}...")
    res = subprocess.run(["genvm-lint", "check", contract_path])
    sys.exit(res.returncode)

if __name__ == "__main__":
    main()
