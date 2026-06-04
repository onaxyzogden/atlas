import docx2txt, sys
files = [
    r"C:\Users\MY OWN AXIS\Downloads\OLOS_Plan_Stage_Developer_Spec.docx",
    r"C:\Users\MY OWN AXIS\Downloads\OLOS_Plan_Navigation_Spec_v1 (1).docx",
    r"C:\Users\MY OWN AXIS\Downloads\OLOS_Spec_Suite_Handoff_Index_v1.docx",
]
out = sys.argv[1]
with open(out, "w", encoding="utf-8") as f:
    for path in files:
        f.write("==== " + path + " ====\n\n")
        try:
            f.write(docx2txt.process(path))
        except Exception as e:
            f.write("[ERR " + str(e) + "]\n")
        f.write("\n\n")
print("OK", out)
