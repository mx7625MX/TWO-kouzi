#!/usr/bin/env python3
import sys
import os
from pypdf import PdfReader

def extract_pdf_text(pdf_path):
    """Extract text from a PDF file"""
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        return f"Error extracting {pdf_path}: {str(e)}"

def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_pdf.py <pdf_file>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(f"Error: File not found: {pdf_path}")
        sys.exit(1)
    
    text = extract_pdf_text(pdf_path)
    print(text)

if __name__ == "__main__":
    main()
