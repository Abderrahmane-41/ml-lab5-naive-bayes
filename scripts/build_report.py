"""Export the lab notebook to a static HTML report for Vercel."""
from pathlib import Path

import nbconvert
from nbconvert import HTMLExporter

ROOT = Path(__file__).resolve().parents[1]
NOTEBOOK = ROOT / "Lab5__Naive_Bayes.ipynb"
OUT_DIR = ROOT / "public"
OUT_FILE = OUT_DIR / "index.html"


def main() -> None:
    if not NOTEBOOK.exists():
        raise FileNotFoundError(NOTEBOOK)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    body, _ = nbconvert.export(
        HTMLExporter(),
        NOTEBOOK,
        resources={"metadata": {"name": NOTEBOOK.stem}},
    )
    OUT_FILE.write_text(body, encoding="utf-8")
    print(f"Wrote {OUT_FILE}")


if __name__ == "__main__":
    main()
