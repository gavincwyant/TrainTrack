import { describe, it, expect, beforeAll } from 'vitest'
import { encrypt, decrypt } from '@/lib/encryption'

describe('Encryption utilities', () => {
  beforeAll(() => {
    // Ensure ENCRYPTION_KEY is set for tests
    if (!process.env.ENCRYPTION_KEY) {
      process.env.ENCRYPTION_KEY =
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    }
  })

  describe('encrypt()', () => {
    it('should encrypt text successfully', async () => {
      const plaintext = 'google_access_token_12345'
      const encrypted = await encrypt(plaintext)

      expect(encrypted).toBeDefined()
      expect(typeof encrypted).toBe('string')
      expect(encrypted).not.toBe(plaintext)
    })

    it('should produce valid JSON with iv, encryptedData, and authTag', async () => {
      const plaintext = 'test_secret'
      const encrypted = await encrypt(plaintext)

      const parsed = JSON.parse(encrypted)
      expect(parsed).toHaveProperty('iv')
      expect(parsed).toHaveProperty('encryptedData')
      expect(parsed).toHaveProperty('authTag')
      expect(typeof parsed.iv).toBe('string')
      expect(typeof parsed.encryptedData).toBe('string')
      expect(typeof parsed.authTag).toBe('string')
    })

    it('should produce different ciphertext for same input (IV randomization)', async () => {
      const plaintext = 'same_text'
      const encrypted1 = await encrypt(plaintext)
      const encrypted2 = await encrypt(plaintext)

      expect(encrypted1).not.toBe(encrypted2)

      // But both should decrypt to the same plaintext
      const decrypted1 = await decrypt(encrypted1)
      const decrypted2 = await decrypt(encrypted2)
      expect(decrypted1).toBe(plaintext)
      expect(decrypted2).toBe(plaintext)
    })

    it('should throw error if ENCRYPTION_KEY is missing', async () => {
      const originalKey = process.env.ENCRYPTION_KEY
      delete process.env.ENCRYPTION_KEY

      await expect(encrypt('test')).rejects.toThrow(
        'ENCRYPTION_KEY environment variable is not set'
      )

      // Restore
      process.env.ENCRYPTION_KEY = originalKey
    })

    it('should throw error if ENCRYPTION_KEY is invalid length', async () => {
      const originalKey = process.env.ENCRYPTION_KEY
      process.env.ENCRYPTION_KEY = 'short_key'

      await expect(encrypt('test')).rejects.toThrow(
        'ENCRYPTION_KEY must be a 32-byte (64-character) hex string'
      )

      // Restore
      process.env.ENCRYPTION_KEY = originalKey
    })
  })

  describe('decrypt()', () => {
    it('should decrypt encrypted text back to original', async () => {
      const original = 'my_secret_token_abc123'
      const encrypted = await encrypt(original)
      const decrypted = await decrypt(encrypted)

      expect(decrypted).toBe(original)
    })

    it('should handle various text lengths', async () => {
      const testCases = [
        'a',
        'short',
        'a much longer string with special characters !@#$%^&*()',
        '🔐 Unicode characters are supported',
        'a'.repeat(1000), // Long string
      ]

      for (const testCase of testCases) {
        const encrypted = await encrypt(testCase)
        const decrypted = await decrypt(encrypted)
        expect(decrypted).toBe(testCase)
      }
    })

    it('should throw error if ENCRYPTION_KEY is missing during decryption', async () => {
      const encrypted = await encrypt('test')
      const originalKey = process.env.ENCRYPTION_KEY
      delete process.env.ENCRYPTION_KEY

      await expect(decrypt(encrypted)).rejects.toThrow(
        'ENCRYPTION_KEY environment variable is not set'
      )

      // Restore
      process.env.ENCRYPTION_KEY = originalKey
    })

    it('should fail if decryption key is different from encryption key', async () => {
      const originalKey = process.env.ENCRYPTION_KEY
      const encrypted = await encrypt('test')

      // Change key
      process.env.ENCRYPTION_KEY =
        'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210'

      await expect(decrypt(encrypted)).rejects.toThrow()

      // Restore
      process.env.ENCRYPTION_KEY = originalKey
    })

    it('should fail if encrypted data is tampered', async () => {
      const encrypted = await encrypt('test')
      const parsed = JSON.parse(encrypted)

      // Tamper with encrypted data
      parsed.encryptedData = 'tampered'
      const tampered = JSON.stringify(parsed)

      await expect(decrypt(tampered)).rejects.toThrow()
    })
  })

  describe('Round-trip encryption', () => {
    it('should successfully encrypt and decrypt Google access token', async () => {
      const accessToken =
        'ya29.a0AfB_byD1234567890abcdefghijklmnopqrstuvwxyz'
      const encrypted = await encrypt(accessToken)
      const decrypted = await decrypt(encrypted)

      expect(decrypted).toBe(accessToken)
    })

    it('should successfully encrypt and decrypt Google refresh token', async () => {
      const refreshToken = '1//0abcdefghijk-lmnopqrstuvwxyz123456789'
      const encrypted = await encrypt(refreshToken)
      const decrypted = await decrypt(encrypted)

      expect(decrypted).toBe(refreshToken)
    })
  })
})
