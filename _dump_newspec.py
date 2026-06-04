import os, glob
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from docx.oxml.ns import qn

SRC = r"C:\Users\MY OWN AXIS\Documents\OLOS New Spec docs"
OUT = os.path.join(os.environ.get("TEMP", "."), "olos_newspec")
os.makedirs(OUT, exist_ok=True)


def iter_block_items(parent):
    body = parent.element.body
    for child in body.iterchildren():
        if child.tag == qn("w:p"):
            yield Paragraph(child, parent)
        elif child.tag == qn("w:tbl"):
            yield Table(child, parent)


def dump_structured(path, out):
    doc = Document(path)
    with open(out, "w", encoding="utf-8") as f:
        for block in iter_block_items(doc):
            if isinstance(block, Paragraph):
                t = block.text.strip()
                if t:
                    f.write(t + "\n")
            else:
                f.write("\n[TABLE]\n")
                for row in block.rows:
                    cells = [c.text.strip().replace("\n", " / ") for c in row.cells]
                    f.write(" | ".join(cells) + "\n")
                f.write("[/TABLE]\n\n")


for path in sorted(glob.glob(os.path.join(SRC, "*.docx"))):
    name = os.path.splitext(os.path.basename(path))[0]
    out = os.path.join(OUT, name + ".txt")
    try:
        dump_structured(path, out)
        n = os.path.getsize(out)
        print("OK", name, n)
    except Exception as e:
        print("ERR", name, repr(e))

print("OUTDIR", OUT)
