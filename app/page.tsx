import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">TrainTrack</h1>
          <nav className="space-x-4">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-5xl font-bold mb-6">
            Manage Your Personal Training Business
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            TrainTrack helps personal trainers manage clients, schedule sessions,
            track workouts, and automate invoicing - all in one place.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Start Free Trial
            </Link>
            <Link
              href="#features"
              className="px-8 py-3 text-lg font-medium text-gray-700 border-2 border-gray-300 rounded-lg hover:border-gray-400"
            >
              Learn More
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-gray-50 py-20">
          <div className="container mx-auto px-4">
            <h3 className="text-3xl font-bold text-center mb-12">
              Everything You Need to Run Your Training Business
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-4xl mb-4">📅</div>
                <h4 className="text-xl font-semibold mb-2">Smart Scheduling</h4>
                <p className="text-gray-600">
                  Let clients book sessions based on your availability. Automatic
                  conflict detection and email confirmations.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-4xl mb-4">💪</div>
                <h4 className="text-xl font-semibold mb-2">Workout Tracking</h4>
                <p className="text-gray-600">
                  Log exercises, track progress, and define custom metrics for each
                  client. Visualize progress over time.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="text-4xl mb-4">💰</div>
                <h4 className="text-xl font-semibold mb-2">Automated Invoicing</h4>
                <p className="text-gray-600">
                  Generate invoices automatically per-session or monthly. Track
                  payments and send professional PDFs via email.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
            <p className="text-xl text-gray-600 mb-8">
              Join trainers who are streamlining their business with TrainTrack
            </p>
            <Link
              href="/signup"
              className="px-8 py-3 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 inline-block"
            >
              Create Your Account
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2025 TrainTrack. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
