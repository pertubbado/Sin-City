#!/usr/bin/env python3
"""Gera os dados publicados em site/ a partir dos capítulos Markdown da pasta docs/."""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITE = ROOT / "site"

CATEGORIES = [
    ("primeiros-passos", "Primeiros Passos", "Conheça a cidade, prepare seu personagem e entenda os fundamentos para começar sua história em Sin City.", "🚦"),
    ("regras-gerais", "Regras Gerais", "Princípios fundamentais de convivência, imersão, combate e respeito às regras da cidade.", "⚖️"),
    ("vida-na-cidade", "Vida na Cidade", "Regras para identidade, economia, negociações, territórios e convivência no cotidiano de Sin City.", "🏙️"),
    ("acoes-e-confrontos", "Ações e Confrontos", "Procedimentos para iniciar, conduzir e encerrar ações, confrontos e fugas.", "⚔️"),
    ("atividades-criminosas", "Atividades Criminosas", "Regras específicas para roubos, sequestros, eventos especiais e outras atividades ilegais.", "🕶️"),
    ("organizacoes", "Organizações", "Estrutura, liderança, recrutamento, territórios e relações entre organizações.", "🏴"),
    ("policia-e-justica", "Polícia e Justiça", "Limites de atuação, abordagens, perseguições, uso da força e procedimentos legais.", "🚓"),
    ("automobilismo", "Automobilismo", "Regras de direção, mercado automotivo, corridas, apostas e competições.", "🏁"),
    ("administracao-e-suporte", "Administração e Suporte", "Procedimentos oficiais para denúncias, provas, punições, recursos e atendimento da Staff.", "🛡️"),
]
PREFERRED_FILES = {
    "primeiros-passos": ["sin-city-roleplay.md", "orientacoes-iniciais.md"],
    "regras-gerais": ["regras-absolutas.md", "imersao-e-conduta.md"],
    "vida-na-cidade": ["personagens-e-identidade.md"],
    "acoes-e-confrontos": ["regras-gerais-de-acoes.md", "inicio-e-participacao.md"],
    "atividades-criminosas": ["assaltos-atm-e-registradoras.md"],
    "organizacoes": ["estrutura-e-lideranca.md"],
    "policia-e-justica": ["abordagens-e-revistas.md"],
    "automobilismo": ["veiculos-e-terrenos.md"],
    "administracao-e-suporte": ["denuncias-e-tickets.md"],
}
CONTAINER_LABELS = {
    "warning": "⚠️ **ATENÇÃO**",
    "danger": "🚨 **ATENÇÃO**",
    "info": "ℹ️ **INFORMAÇÃO**",
    "tip": "💡 **DICA**",
    "details": "ℹ️ **DETALHES**",
}


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    normalized = "".join(char for char in normalized if unicodedata.category(char) != "Mn")
    return re.sub(r"[^a-zA-Z0-9]+", "-", normalized.lower()).strip("-")[:80] or "secao"


def prepare_markdown(markdown: str) -> str:
    """Convert VitePress callout blocks to Markdown blockquotes for the site renderer."""
    lines = markdown.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    output: list[str] = []
    in_container = False

    for line in lines:
        stripped = line.strip()
        opening = re.match(r"^:::\s*(warning|danger|info|tip|details)(?:\s+.*)?$", stripped, re.I)
        if opening:
            if in_container:
                output.append(">")
            output.append("> " + CONTAINER_LABELS[opening.group(1).lower()])
            in_container = True
            continue
        if in_container and stripped == ":::":
            in_container = False
            output.append("")
            continue
        if in_container:
            output.append(">" + (" " + line if line else ""))
            continue
        if re.match(r"^\s*(\*\*\*+|---+|___+)\s*$", line):
            output.append("")
        else:
            output.append(line)

    text = "\n".join(output).strip()
    # The site renderer doesn't interpret HTML figures; the logo already exists in the site header.
    text = re.sub(r"<figure>.*?</figure>", "", text, flags=re.S | re.I)
    return text.strip()


def chapter_description(markdown: str, fallback: str) -> str:
    title_removed = re.sub(r"^#\s+.+?\s*#*\s*\n+", "", markdown, count=1, flags=re.M)
    paragraph = re.split(r"\n\s*\n|\n#{2,}\s", title_removed.strip(), maxsplit=1)[0]
    paragraph = re.sub(r"[`*_>#]", "", paragraph).strip()
    paragraph = re.sub(r"\s+", " ", paragraph)
    if len(paragraph) < 35:
        return fallback
    if len(paragraph) > 230:
        paragraph = paragraph[:230].rsplit(" ", 1)[0] + "…"
    return paragraph


def build_data() -> dict:
    output_categories = []
    total_chapters = 0
    for category_index, (folder, title, fallback_description, icon) in enumerate(CATEGORIES, start=1):
        folder_path = ROOT / "docs" / folder
        preferred = PREFERRED_FILES.get(folder, [])
        markdown_files = list(folder_path.glob("*.md"))
        markdown_files.sort(key=lambda path: (preferred.index(path.name) if path.name in preferred else 1000, path.name.casefold()))
        subcategories = []

        for page_index, path in enumerate(markdown_files, start=1):
            source = path.read_text(encoding="utf-8-sig")
            heading = re.search(r"^#\s+(.+?)\s*#*\s*$", source, flags=re.M)
            chapter_title = heading.group(1).strip() if heading else path.stem.replace("-", " ").title()
            body_source = source[:heading.start()] + source[heading.end():] if heading else source
            body = prepare_markdown(body_source)
            subcategories.append({
                "id": slugify(path.stem),
                "name": chapter_title,
                "icon": icon,
                "desc": "",
                "rules": [{
                    "code": f"{category_index:02d}.{page_index:02d}",
                    "title": chapter_title,
                    "text": body,
                    "tag": title.upper(),
                }],
            })

        total_chapters += len(subcategories)
        description = fallback_description
        if markdown_files:
            description = chapter_description(markdown_files[0].read_text(encoding="utf-8-sig"), fallback_description)

        output_categories.append({
            "id": folder,
            "code": f"{category_index:02d}",
            "name": title.upper(),
            "short": title,
            "desc": description,
            "image": "./assets/cemetery-halloween.svg",
            "rules": [],
            "subcategories": subcategories,
        })

    return {
        "categories": output_categories,
        "updates": [{
            "date": "30/10/2026",
            "title": "Nova identidade Sin City",
            "text": "Portal reorganizado com identidade Sin City, nove categorias e pesquisa integrada.",
            "tag": "NOVA IDENTIDADE",
        }],
    }


def main() -> None:
    data = build_data()
    json_text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    (SITE / "content" / "rules.json").write_text(json_text, encoding="utf-8")
    (SITE / "rules.json").write_text(json_text, encoding="utf-8")
    chapters = sum(len(category["subcategories"]) for category in data["categories"])
    print(f"Regras sincronizadas: {chapters} capítulos em {len(data['categories'])} categorias.")


if __name__ == "__main__":
    main()
