import { prisma } from '../lib/db'

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'gavincwyant@gmail.com' },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
      workspaceId: true,
      createdAt: true,
    },
  })

  if (user) {
    console.log('✅ User found:')
    console.log(JSON.stringify(user, null, 2))
  } else {
    console.log('❌ User not found with email: gavincwyant@gmail.com')

    // Check all users
    const allUsers = await prisma.user.findMany({
      select: {
        email: true,
        fullName: true,
        role: true,
      },
      take: 10,
    })
    console.log(`\n📋 Found ${allUsers.length} users in database (showing first 10):`)
    console.log(JSON.stringify(allUsers, null, 2))
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
