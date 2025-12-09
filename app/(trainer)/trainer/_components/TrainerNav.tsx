"use client"

import { TrainerDropdown } from "./TrainerDropdown"
import { handleSignOut } from "./actions"

type Props = {
  trainerName: string
  isSystemAdmin?: boolean
}

export function TrainerNav({ trainerName, isSystemAdmin }: Props) {
  const onSignOut = async () => {
    await handleSignOut()
  }

  return <TrainerDropdown trainerName={trainerName} onSignOut={onSignOut} isSystemAdmin={isSystemAdmin} />
}
