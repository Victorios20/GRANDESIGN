import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import path from "node:path"

export type PropostaPDFData = {
  numero: string
  titulo: string
  clienteNome: string
  descricaoServico: string
  dimensoes?: string | null
  itens: string[]
  valorFinal: number
  formaPagamento?: string | null
  prazoExecucao?: string | null
  validade?: string | null
}

const COLORS = {
  olive: "#3F3D1E",
  cream: "#FDF3E3",
  gold: "#E0B64F",
  green: "#2E7D32",
  dark: "#2C201B",
  white: "#FFFFFF",
}

const CNPJ = "59.769.971/0001-43"
const WHATSAPP = "(85) 9 9411-5576"

// Assets resolvidos a partir da pasta public (execução server-side)
const publicDir = path.join(process.cwd(), "public", "images")
const CAPA = path.join(publicDir, "proposta-capa.jpg")
const LOGO = path.join(publicDir, "logo.png")

const brl = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)

const styles = StyleSheet.create({
  page: { fontSize: 11, color: COLORS.dark },
  coverImage: { position: "absolute", top: 0, left: 0, width: "100%", height: 560 },
  coverBand: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.olive,
    padding: 32,
    minHeight: 260,
  },
  coverKicker: { color: COLORS.cream, fontSize: 12, marginBottom: 8 },
  coverRule: { width: 80, height: 4, backgroundColor: COLORS.gold, marginBottom: 16 },
  coverTitle: { color: COLORS.cream, fontSize: 40, fontWeight: 700, lineHeight: 1.1 },
  coverSubtitle: { color: COLORS.white, fontSize: 22, marginTop: 8 },
  coverLogo: {
    position: "absolute",
    right: 32,
    bottom: 32,
    width: 96,
    height: 96,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 8,
  },
  section: { padding: 40 },
  h2: { fontSize: 26, fontWeight: 700, color: COLORS.dark },
  h2rule: { width: 80, height: 4, backgroundColor: COLORS.gold, marginTop: 8, marginBottom: 24 },
  card: { backgroundColor: COLORS.cream, borderRadius: 16, padding: 24 },
  cardTitle: { fontSize: 15, fontWeight: 700, marginBottom: 8 },
  paragraph: { lineHeight: 1.5 },
  dims: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.gold, fontWeight: 700 },
  materiaisTitle: { fontSize: 16, fontWeight: 700, marginTop: 40, marginBottom: 16 },
  materiaisGrid: { flexDirection: "row", flexWrap: "wrap" },
  materialItem: { width: "50%", flexDirection: "row", marginBottom: 12 },
  bullet: { marginRight: 8 },
  priceCard: {
    borderWidth: 1,
    borderColor: COLORS.gold,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginTop: 8,
  },
  price: { fontSize: 36, fontWeight: 700, color: COLORS.green },
  priceHint: { marginTop: 8, color: COLORS.dark, opacity: 0.6 },
  condTitle: { fontSize: 20, fontWeight: 700, marginTop: 40, marginBottom: 16 },
  condRow: { flexDirection: "row", gap: 12 },
  condCard: { flex: 1, borderWidth: 1, borderColor: "#EFE7D5", borderRadius: 12, padding: 16, alignItems: "center" },
  condCardTitle: { fontWeight: 700, marginBottom: 6 },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.olive,
    paddingVertical: 14,
    paddingHorizontal: 32,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { color: COLORS.cream, fontSize: 10 },
})

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>CNPJ: {CNPJ}</Text>
      <Text style={styles.footerText}>Whatsapp: {WHATSAPP}</Text>
    </View>
  )
}

export function PropostaServicoDocument({ data }: { data: PropostaPDFData }) {
  return (
    <Document>
      {/* Capa */}
      <Page size="A4" style={styles.page}>
        <Image src={CAPA} style={styles.coverImage} />
        <View style={styles.coverBand}>
          <Text style={styles.coverKicker}>Proposta nº {data.numero}</Text>
          <View style={styles.coverRule} />
          <Text style={styles.coverTitle}>Proposta{"\n"}de Serviço</Text>
          <Text style={styles.coverSubtitle}>{data.titulo}</Text>
        </View>
        <Image src={LOGO} style={styles.coverLogo} />
      </Page>

      {/* Descrição */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.h2}>Descrição do Serviço</Text>
          <View style={styles.h2rule} />
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Detalhes do projeto</Text>
            <Text style={styles.paragraph}>{data.descricaoServico}</Text>
            {data.dimensoes ? <Text style={styles.dims}>Dimensões: {data.dimensoes}</Text> : null}
          </View>

          {data.itens.length > 0 ? (
            <>
              <Text style={styles.materiaisTitle}>Material incluso no valor desta proposta:</Text>
              <View style={styles.materiaisGrid}>
                {data.itens.map((it, i) => (
                  <View key={i} style={styles.materialItem}>
                    <Text style={styles.bullet}>•</Text>
                    <Text>{it}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </View>
        <Footer />
      </Page>

      {/* Investimento */}
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.h2}>Investimento</Text>
          <View style={styles.h2rule} />
          <View style={styles.priceCard}>
            <Text style={styles.price}>{brl(data.valorFinal)}</Text>
            <Text style={styles.priceHint}>OU À VISTA NO PIX COM SUPER DESCONTO</Text>
          </View>

          <Text style={styles.condTitle}>Condições comerciais</Text>
          <View style={styles.condRow}>
            <View style={styles.condCard}>
              <Text style={styles.condCardTitle}>Forma de pagamento</Text>
              <Text>{data.formaPagamento || "A combinar"}</Text>
            </View>
            <View style={styles.condCard}>
              <Text style={styles.condCardTitle}>Prazo de execução</Text>
              <Text>{data.prazoExecucao || "A combinar"}</Text>
            </View>
            <View style={styles.condCard}>
              <Text style={styles.condCardTitle}>Validade</Text>
              <Text>{data.validade || "—"}</Text>
            </View>
          </View>
        </View>
        <Footer />
      </Page>
    </Document>
  )
}
