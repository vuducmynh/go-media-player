import sys
import re

def main():
    tag = sys.argv[1] if len(sys.argv) > 1 else ""
    if not tag:
        print("No tag provided")
        return

    try:
        with open("CHANGELOG.md", "r", encoding="utf-8") as f:
            content = f.read()

        pattern = r"## \[" + re.escape(tag) + r"\][^\n]*\n(.*?)(?=\n## \[|\Z)"
        match = re.search(pattern, content, re.DOTALL)
        if match:
            notes = match.group(1).strip()
            with open("release_notes.md", "w", encoding="utf-8") as out:
                out.write(notes)
            print(f"Successfully extracted release notes for {tag}")
        else:
            print(f"No matching release notes found for {tag} in CHANGELOG.md")
    except Exception as e:
        print(f"Error extracting notes: {e}")

if __name__ == "__main__":
    main()
