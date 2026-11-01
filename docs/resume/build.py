"""Embed fonts into the resume HTML, render A4 PDFs with Chromium and report page counts."""
import base64
import pathlib
import sys

from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT = pathlib.Path(__file__).parent
FONTS = ROOT / "node_modules/@fontsource"
OUT = ROOT / "out"
OUT.mkdir(exist_ok=True)


def face(family: str, path: pathlib.Path, weight: int) -> str:
    data = base64.b64encode(path.read_bytes()).decode()
    return (f"@font-face{{font-family:'{family}';font-weight:{weight};font-style:normal;"
            f"src:url(data:font/woff2;base64,{data}) format('woff2');}}\n")


css = ""
for w in (400, 600, 700):
    css += face("Inter", FONTS / f"inter/files/inter-latin-{w}-normal.woff2", w)
for w in (400, 700, 800):
    css += face("Vazirmatn", FONTS / f"vazirmatn/files/vazirmatn-arabic-{w}-normal.woff2", w)
    css += face("Vazirmatn", FONTS / f"vazirmatn/files/vazirmatn-latin-{w}-normal.woff2", w)

jobs = {"en": "Hootan_Seifi_Resume_EN", "fa": "Hootan_Seifi_Resume_FA"}
with sync_playwright() as p:
    browser = p.chromium.launch()
    for lang, name in jobs.items():
        html = (ROOT / f"src_{lang}.html").read_text(encoding="utf-8").replace("/*FONTS*/", css)
        html_path = OUT / f"{name}.html"
        html_path.write_text(html, encoding="utf-8")
        page = browser.new_page()
        page.goto(html_path.as_uri())
        page.wait_for_timeout(500)
        pdf_path = OUT / f"{name}.pdf"
        page.pdf(path=str(pdf_path), format="A4", print_background=True, prefer_css_page_size=True)
        page.close()
        print(name, "pages:", len(PdfReader(str(pdf_path)).pages))
    browser.close()
sys.exit(0)
