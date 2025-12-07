import crypto from "crypto"

const algorithm = "aes-256-gcm"
const secretKey = process.env.ENCRYPTION_KEY!

if (!secretKey) {
  throw new Error("ENCRYPTION_KEY environment variable is not set")
}

if (Buffer.from(secretKey, "hex").length !== 32) {
  throw new Error("ENCRYPTION_KEY must be a 32-byte (64-character) hex string")
}

export async function encrypt(text: string): Promise<string> {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(
    algorithm,
    Buffer.from(secretKey, "hex"),
    iv
  )

  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return JSON.stringify({
    iv: iv.toString("hex"),
    encryptedData: encrypted.toString("hex"),
    authTag: authTag.toString("hex"),
  })
}

export async function decrypt(encryptedText: string): Promise<string> {
  const { iv, encryptedData, authTag } = JSON.parse(encryptedText)

  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(secretKey, "hex"),
    Buffer.from(iv, "hex")
  )

  decipher.setAuthTag(Buffer.from(authTag, "hex"))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedData, "hex")),
    decipher.final(),
  ])

  return decrypted.toString("utf8")
}
