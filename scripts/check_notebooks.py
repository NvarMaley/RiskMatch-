from pathlib import Path
import nbformat

paths = sorted(Path("notebooks").glob("*.ipynb"))
assert [p.name for p in paths] == ["RiskMatch_V3.ipynb"], paths
notebook = nbformat.read(paths[0], as_version=4)
nbformat.validate(notebook)
for number in range(1, 28):
    assert any(f'id="chapitre-{number:02}"' in c.source for c in notebook.cells), number
print("Single notebook validated: 27 chapters.")
