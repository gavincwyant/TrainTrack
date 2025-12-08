"use client"

import { TrainerDropdown } from "./TrainerDropdown"
import { handleSignOut } from "./actions"

type Props = {
  trainerName: string
}

export function TrainerNav({ trainerName }: Props) {
  const onSignOut = async () => {
    await handleSignOut()
  }

  return <TrainerDropdown trainerName={trainerName} onSignOut={onSignOut} />
}
