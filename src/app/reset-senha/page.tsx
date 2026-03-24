import { Suspense } from "react"
import ResetSenhaClient from "./ResetSenhaClient"

export const dynamic = "force-dynamic"

export default function ResetSenhaPage() {
  return (
    <Suspense fallback={null}>
      <ResetSenhaClient />
    </Suspense>
  )
}
