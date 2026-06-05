import sys

SPECS = {
    "secondary": r"C:\Users\MY OWN AXIS\Downloads\OLOS_Project_Type_Secondary_Layer_Spec_v1.2.docx",
    "templates": r"C:\Users\MY OWN AXIS\Downloads\OLOS_Project_Type_Templates_Developer_Spec.docx",
    "plannav": r"C:\Users\MY OWN AXIS\Downloads\OLOS_Plan_Navigation_Spec_v1 (1).docx",
    "wizard": r"C:\Users\MY OWN AXIS\Downloads\OLOS_Project_Creation_Wizard_Spec_v1 (1).docx",
}

try:
    from docx import Document
    from docx.table import Table
    from docx.text.paragraph import Paragraph
    from docx.oxml.ns import qn
    HAVE_DOCX = True
except ImportError:
    HAVE_DOCX = False
    import docx2txt


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


def dump_flat(path, out):
    with open(out, "w", encoding="utf-8") as f:
        f.write(docx2txt.process(path))


for key, path in SPECS.items():
    out = "_typespec_" + key + ".txt"
    try:
        if HAVE_DOCX:
            dump_structured(path, out)
        else:
            dump_flat(path, out)
        print("OK", key, "->", out)
    except Exception as e:
        print("ERR", key, repr(e))

print("docx-mode" if HAVE_DOCX else "docx2txt-mode")
