import { LoginForm } from '@/components/login-form'

export const metadata = { title: 'Acceso — TaskFlow AI' }

interface LoginPageProps {
  searchParams: Promise<{ error?: string; tab?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, tab } = await searchParams

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center px-4">
      <LoginForm defaultTab={tab} serverError={error} />
    </div>
  )
}
