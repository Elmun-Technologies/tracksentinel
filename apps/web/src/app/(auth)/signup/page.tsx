import { SignupForm } from '@/components/auth/signup-form'

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">TrackSentinel</h1>
          <p className="mt-2 text-sm text-gray-600">
            Create your agency account
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  )
}
