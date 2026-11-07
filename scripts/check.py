#!/usr/bin/env python3
"""
ai-lab repository validator.

Enforces architecture rules from AGENTS.md:
1. No domain-root absolute paths (href="/...", src="/...")
2. Card synchronization between arcade/sandbox landing pages and subdirectories
3. Required page metadata (<title>, viewport, back link, meta description for arcade)
4. No CSS @import of Google Fonts (must use HTML <link> tags)
5. No cross-project asset imports (subprojects must be self-contained)

Exit code: 0 on success, 1 on any violation.
"""

import os
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

# Directories to skip when scanning files
IGNORED_DIRS = {'.git', '.github', '.agents', '.templates', '_ideas', 'node_modules', 'dist'}


class HTMLCardExtractor(HTMLParser):
    """Extracts card links from arcade and sandbox landing pages."""
    def __init__(self):
        super().__init__()
        self.cards = []

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            attr_dict = dict(attrs)
            href = attr_dict.get('href', '')
            classes = attr_dict.get('class', '').split()
            # Identify card elements
            is_card = any('card' in cls.lower() for cls in classes)
            if is_card and href and not href.startswith(('http://', 'https://', '../', '#')):
                slug = href.strip('/').split('/')[0]
                if slug:
                    self.cards.append(slug)


def get_repo_root() -> Path:
    """Finds repository root assuming script lives in repo/scripts/."""
    script_path = Path(__file__).resolve()
    return script_path.parent.parent


def check_domain_root_absolute_paths(repo_root: Path) -> list[str]:
    """Check: No domain-root absolute paths (href="/...", src="/...")."""
    errors = []
    # Pattern to match href="/..." or src="/..." or url(/...)
    attr_pattern = re.compile(r'(href|src)\s*=\s*["\'](/[^"\']*)["\']', re.IGNORECASE)
    css_url_pattern = re.compile(r'url\(\s*["\']?(/[^"\'\)]+)["\']?\s*\)', re.IGNORECASE)

    for path in repo_root.rglob('*'):
        if any(part in IGNORED_DIRS for part in path.parts):
            continue
        if path.suffix not in ('.html', '.css', '.js'):
            continue

        try:
            content = path.read_text(encoding='utf-8', errors='ignore')
        except Exception as e:
            errors.append(f"Could not read {path.relative_to(repo_root)}: {e}")
            continue

        rel_path = path.relative_to(repo_root)

        for match in attr_pattern.finditer(content):
            attr_name, val = match.groups()
            # Exception: Root index.html links back to organization home (e.g. buchmiller-org.github.io/)
            if rel_path == Path('index.html') and val == '/':
                continue
            errors.append(f"{rel_path}: Domain-root absolute path found in {attr_name}=\"{val}\" (must use relative path)")

        for match in css_url_pattern.finditer(content):
            val = match.group(1)
            errors.append(f"{rel_path}: Domain-root absolute path found in url({val})")

    return errors


def check_landing_cards(repo_root: Path) -> list[str]:
    """Check: Every folder in arcade/ and sandbox/ has a card in landing page and vice versa."""
    errors = []

    # 1. Arcade check
    arcade_dir = repo_root / 'arcade'
    arcade_index = arcade_dir / 'index.html'
    if arcade_dir.is_dir() and arcade_index.is_file():
        parser = HTMLCardExtractor()
        parser.feed(arcade_index.read_text(encoding='utf-8', errors='ignore'))
        card_slugs = set(parser.cards)

        disk_dirs = {
            d.name for d in arcade_dir.iterdir()
            if d.is_dir() and not d.name.startswith('.') and (d / 'index.html').is_file()
        }

        missing_cards = disk_dirs - card_slugs
        missing_dirs = card_slugs - disk_dirs

        for missing in sorted(missing_cards):
            errors.append(f"arcade/: Directory '{missing}' exists but has no corresponding card in arcade/index.html")
        for missing in sorted(missing_dirs):
            errors.append(f"arcade/index.html: Card points to '{missing}' but arcade/{missing}/index.html does not exist")

    # 2. Sandbox check
    sandbox_dir = repo_root / 'sandbox'
    sandbox_index = sandbox_dir / 'index.html'
    if sandbox_dir.is_dir() and sandbox_index.is_file():
        parser = HTMLCardExtractor()
        parser.feed(sandbox_index.read_text(encoding='utf-8', errors='ignore'))
        card_slugs = set(parser.cards)

        disk_dirs = {
            d.name for d in sandbox_dir.iterdir()
            if d.is_dir() and not d.name.startswith('.') and (d / 'index.html').is_file()
        }

        missing_cards = disk_dirs - card_slugs
        missing_dirs = card_slugs - disk_dirs

        for missing in sorted(missing_cards):
            errors.append(f"sandbox/: Directory '{missing}' exists but has no corresponding card in sandbox/index.html")
        for missing in sorted(missing_dirs):
            errors.append(f"sandbox/index.html: Card points to '{missing}' but sandbox/{missing}/index.html does not exist")

    return errors


def check_page_metadata_and_backlinks(repo_root: Path) -> list[str]:
    """Check: Every game/prototype page has <title>, meta description (arcade), viewport, back link."""
    errors = []

    # Check arcade games
    arcade_dir = repo_root / 'arcade'
    if arcade_dir.is_dir():
        for game_dir in sorted(arcade_dir.iterdir()):
            if not game_dir.is_dir() or game_dir.name.startswith('.'):
                continue
            index_file = game_dir / 'index.html'
            if not index_file.is_file():
                errors.append(f"arcade/{game_dir.name}: Missing index.html")
                continue

            content = index_file.read_text(encoding='utf-8', errors='ignore')
            rel_file = index_file.relative_to(repo_root)

            # <title>
            title_match = re.search(r'<title>([^<]+)</title>', content, re.IGNORECASE)
            if not title_match or not title_match.group(1).strip():
                errors.append(f"{rel_file}: Missing or empty <title>")

            # meta viewport
            if not re.search(r'<meta[^>]+name=["\']viewport["\']', content, re.IGNORECASE):
                errors.append(f"{rel_file}: Missing <meta name=\"viewport\">")

            # meta description (required for arcade games)
            desc_match = re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']', content, re.IGNORECASE)
            if not desc_match:
                desc_match = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']description["\']', content, re.IGNORECASE)
            if not desc_match or not desc_match.group(1).strip():
                errors.append(f"{rel_file}: Missing or empty <meta name=\"description\">")

            # back link (must link back to arcade: href="../" or href="../index.html")
            has_backlink = bool(re.search(r'<a[^>]+href=["\']\.\./(?:index\.html)?["\']', content, re.IGNORECASE))
            if not has_backlink:
                errors.append(f"{rel_file}: Missing back link to suite (expected <a href=\"../\">)")

    # Check sandbox prototypes
    sandbox_dir = repo_root / 'sandbox'
    if sandbox_dir.is_dir():
        for proto_dir in sorted(sandbox_dir.iterdir()):
            if not proto_dir.is_dir() or proto_dir.name.startswith('.'):
                continue
            index_file = proto_dir / 'index.html'
            if not index_file.is_file():
                errors.append(f"sandbox/{proto_dir.name}: Missing index.html")
                continue

            content = index_file.read_text(encoding='utf-8', errors='ignore')
            rel_file = index_file.relative_to(repo_root)

            # <title>
            title_match = re.search(r'<title>([^<]+)</title>', content, re.IGNORECASE)
            if not title_match or not title_match.group(1).strip():
                errors.append(f"{rel_file}: Missing or empty <title>")

            # meta viewport
            if not re.search(r'<meta[^>]+name=["\']viewport["\']', content, re.IGNORECASE):
                errors.append(f"{rel_file}: Missing <meta name=\"viewport\">")

            # back link (must link back to sandbox: href="../" or href="../index.html")
            has_backlink = bool(re.search(r'<a[^>]+href=["\']\.\./(?:index\.html)?["\']', content, re.IGNORECASE))
            if not has_backlink:
                errors.append(f"{rel_file}: Missing back link to sandbox (expected <a href=\"../\">)")

    return errors


def check_no_css_font_imports(repo_root: Path) -> list[str]:
    """Check: No CSS @import of Google Fonts (must use <link> tags in HTML to avoid FOUT)."""
    errors = []
    # Match @import with googleapis or any font url in css
    font_import_pattern = re.compile(r'@import\s+[^;]*fonts\.googleapis\.com', re.IGNORECASE)

    for path in repo_root.rglob('*'):
        if any(part in IGNORED_DIRS for part in path.parts):
            continue
        if path.suffix not in ('.css', '.html'):
            continue

        try:
            content = path.read_text(encoding='utf-8', errors='ignore')
        except Exception:
            continue

        if font_import_pattern.search(content):
            rel_path = path.relative_to(repo_root)
            errors.append(f"{rel_path}: CSS @import of Google Fonts detected. Use HTML <link> tags instead to prevent FOUT.")

    return errors


def check_no_cross_project_asset_imports(repo_root: Path) -> list[str]:
    """Check: No cross-project asset leaks or illegal parent directory references."""
    errors = []

    # Helper regex for relative asset links
    link_pattern = re.compile(r'(?:href|src)\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)
    css_url_pattern = re.compile(r'url\(\s*["\']?([^"\'\)]+)["\']?\s*\)', re.IGNORECASE)

    # 1. Arcade game subdirectories
    arcade_dir = repo_root / 'arcade'
    if arcade_dir.is_dir():
        for game_dir in arcade_dir.iterdir():
            if not game_dir.is_dir() or game_dir.name.startswith('.'):
                continue
            for file_path in game_dir.rglob('*'):
                if file_path.suffix not in ('.html', '.css', '.js'):
                    continue
                content = file_path.read_text(encoding='utf-8', errors='ignore')
                rel_file = file_path.relative_to(repo_root)

                urls = [m.group(1) for m in link_pattern.finditer(content)]
                urls += [m.group(1) for m in css_url_pattern.finditer(content)]

                for url in urls:
                    url_clean = url.split('?')[0].split('#')[0].strip()
                    if url_clean.startswith(('http://', 'https://', 'data:', 'javascript:', '#', 'mailto:')):
                        continue
                    # Allowed parent references for arcade game:
                    # - '../' or '../index.html' (back link)
                    # - '../styles.css' (shared arcade suite stylesheet)
                    if url_clean in ('../', '../index.html', '../styles.css'):
                        continue
                    if url_clean.startswith('../'):
                        errors.append(f"{rel_file}: Disallowed cross-project or parent asset reference '{url}'")

    # 2. Sandbox prototype subdirectories
    sandbox_dir = repo_root / 'sandbox'
    if sandbox_dir.is_dir():
        for proto_dir in sandbox_dir.iterdir():
            if not proto_dir.is_dir() or proto_dir.name.startswith('.'):
                continue
            for file_path in proto_dir.rglob('*'):
                if file_path.suffix not in ('.html', '.css', '.js'):
                    continue
                content = file_path.read_text(encoding='utf-8', errors='ignore')
                rel_file = file_path.relative_to(repo_root)

                urls = [m.group(1) for m in link_pattern.finditer(content)]
                urls += [m.group(1) for m in css_url_pattern.finditer(content)]

                for url in urls:
                    url_clean = url.split('?')[0].split('#')[0].strip()
                    if url_clean.startswith(('http://', 'https://', 'data:', 'javascript:', '#', 'mailto:')):
                        continue
                    # Allowed parent references for sandbox prototype:
                    # - '../' or '../index.html' (back link)
                    # - Sub-experiment hubs (e.g. sandbox/optics/stealth/ linking to '../' within optics)
                    # Sandbox projects must NOT import arcade styles (e.g. '../styles.css') or sibling prototypes
                    if url_clean in ('../', '../index.html'):
                        continue
                    if url_clean.startswith('../styles.css'):
                        errors.append(f"{rel_file}: Sandbox prototype illegally imports suite stylesheet '{url}'")
                    elif url_clean.startswith('../') and not any(part == 'optics' for part in file_path.parts):
                        errors.append(f"{rel_file}: Disallowed cross-project asset reference '{url}'")

    # 3. Standalone tools (tools/)
    tools_dir = repo_root / 'tools'
    if tools_dir.is_dir():
        for tool_dir in tools_dir.iterdir():
            if not tool_dir.is_dir() or tool_dir.name.startswith('.'):
                continue
            for file_path in tool_dir.rglob('*'):
                if file_path.suffix not in ('.html', '.css', '.js'):
                    continue
                content = file_path.read_text(encoding='utf-8', errors='ignore')
                rel_file = file_path.relative_to(repo_root)
                urls = [m.group(1) for m in link_pattern.finditer(content)]
                urls += [m.group(1) for m in css_url_pattern.finditer(content)]
                for url in urls:
                    url_clean = url.split('?')[0].split('#')[0].strip()
                    if url_clean.startswith(('http://', 'https://', 'data:', 'javascript:', '#', 'mailto:')):
                        continue
                    if url_clean in ('../', '../../', '../index.html', '../../index.html'):
                        continue
                    if url_clean.startswith('../'):
                        errors.append(f"{rel_file}: Disallowed cross-project asset reference '{url}'")

    return errors


def main():
    repo_root = get_repo_root()
    print("=" * 60)
    print(f"ai-lab repository check: {repo_root}")
    print("=" * 60)

    checks = [
        ("No domain-root absolute paths", check_domain_root_absolute_paths),
        ("Arcade and Sandbox card synchronization", check_landing_cards),
        ("Page metadata and back links", check_page_metadata_and_backlinks),
        ("No CSS @import for Google Fonts", check_no_css_font_imports),
        ("No cross-project asset leaks", check_no_cross_project_asset_imports),
    ]

    total_errors = 0

    for name, check_fn in checks:
        errors = check_fn(repo_root)
        if errors:
            print(f"\n[FAIL] {name} ({len(errors)} error{'s' if len(errors) != 1 else ''}):")
            for err in errors:
                print(f"  ✗ {err}")
            total_errors += len(errors)
        else:
            print(f"[PASS] {name}")

    print("\n" + "=" * 60)
    if total_errors > 0:
        print(f"FAILED: Found {total_errors} violation(s).")
        sys.exit(1)
    else:
        print("SUCCESS: All repository checks passed.")
        sys.exit(0)


if __name__ == '__main__':
    main()
