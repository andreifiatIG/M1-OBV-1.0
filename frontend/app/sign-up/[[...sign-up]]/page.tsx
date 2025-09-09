import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundColor: '#f0f4f8',
        backgroundImage: 'radial-gradient(125% 125% at 50% 90%, #ffffff 40%, #14b8a6 100%)',
        backgroundAttachment: 'fixed'
      }}
    >
      <SignUp />
    </div>
  );
}