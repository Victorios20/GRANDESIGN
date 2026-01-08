#!/bin/bash

echo ""
echo "🚀 =========================================="
echo "   Deploy em Homologação - EasyPanel"
echo "=========================================="
echo ""

DEPLOY_URL="http://109.199.108.241:3000/api/deploy/97fc0182fae47153f27712ca3c31697a0b6c64708b1f7830"

if ! command -v curl &> /dev/null; then
    echo "❌ Erro: curl não está instalado"
    exit 1
fi

echo "⏳ Enviando requisição de deploy..."
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$DEPLOY_URL")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Deploy solicitado com sucesso!"
    echo ""
    echo "📋 Próximos passos:"
    echo "   1. Aguarde 2-3 minutos"
    echo "   2. Verifique o ambiente de homologação"
    echo "   3. Teste as funcionalidades modificadas"
else
    echo "⚠️  Resposta HTTP: $HTTP_CODE"
    echo "   O deploy pode não ter sido executado corretamente"
fi

echo ""
echo "=========================================="
echo ""