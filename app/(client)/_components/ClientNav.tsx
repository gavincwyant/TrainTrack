import { ClientDropdown } from "./ClientDropdown"
import { handleSignOut } from "./actions"

type Props = {
  clientName: string
}

export function ClientNav({ clientName }: Props) {
  return (
    <ClientDropdown
      clientName={clientName}
      onSignOut={handleSignOut}
    />
  )
}
