#!/bin/sh
# Optional runtime branding/configuration; keep the supplied JSON and SVG intact.
if [ -n "${config:-}" ]; then
    printf '%s\n' "$config" > /usr/share/nginx/html/config
fi
if [ -n "${favicon:-}" ]; then
    printf '%s\n' "$favicon" > /usr/share/nginx/html/favicon.svg
fi
if [ -n "${logo:-}" ]; then
    if ! curl --fail --silent --show-error --location --max-time 30 --output /usr/share/nginx/html/logo.png "$logo"; then
        printf '%s\n' 'Não foi possível atualizar o logo; mantendo os demais arquivos da aplicação.' >&2
    fi
fi
