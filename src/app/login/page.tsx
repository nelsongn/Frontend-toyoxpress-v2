import { Metadata } from 'next';
import LoginForm from './LoginForm';

export const metadata: Metadata = {
    title: 'Login - ToyoXpress',
    description: 'Inicia sesión en el sistema administrativo',
};

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <div className="flex justify-center mb-6">
                        <img
                            src="https://toyoxpress.com/wp-content/uploads/2017/07/Ai-LOGO-TOYOXPRESS.png"
                            alt="ToyoXpress"
                            className="h-16 w-auto object-contain"
                        />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Ingresa tus credenciales para continuar
                    </p>
                </div>
                <LoginForm />
            </div>
        </div>
    );
}
