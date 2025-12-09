import { prisma } from '../lib/db'

async function main() {
  const email = process.argv[2] || 'gavincwyant@gmail.com'

  const result = await prisma.user.update({
    where: { email },
    data: { isSystemAdmin: true },
    select: {
      id: true,
      email: true,
      fullName: true,
      isSystemAdmin: true,
      role: true
    }
  })

  console.log('✅ User promoted to admin:', result)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
