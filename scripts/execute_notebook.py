"""Execute only explicitly approved synthetic cells; never write notebook outputs."""

import os
from pathlib import Path
import tempfile

import nbformat
from nbclient import NotebookClient

ROOT = Path(__file__).resolve().parents[1]
APPROVED = {
    "8f95cdb2", "g00-contract-demo", "2ce6b6ef", "5705c45e", "9c5a7449", "186640fa", "03fb60b7", "f06adfb4", "38ace474",
    "d5074fea", "48f37aec", "2cfe2469", "ab589f19", "a8500da9", "bc4f8e89", "74fb14a3", "edf5198d", "da35a876", "0f09d0eb", "6074232c",
}


def main():
    notebook = nbformat.read(ROOT / "notebooks/RiskMatch_V3.ipynb", as_version=4)
    notebook.cells = [c for c in notebook.cells if c.id in APPROVED]
    assert {c.id for c in notebook.cells} == APPROVED
    assert all(c.cell_type == "code" for c in notebook.cells)
    with tempfile.TemporaryDirectory(prefix="riskmatch-notebook-") as runtime:
        os.environ["JUPYTER_RUNTIME_DIR"] = runtime
        os.environ["IPYTHONDIR"] = str(Path(runtime) / "ipython")
        NotebookClient(notebook, kernel_name="python3", timeout=60,
                       resources={"metadata": {"path": str(ROOT)}}).execute()
    print(f"Executed {len(notebook.cells)} synthetic notebook cells; no outputs written.")


if __name__ == "__main__":
    main()
