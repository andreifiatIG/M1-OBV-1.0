import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const { userId } = await auth();
  
  if (userId) {
    // Redirect signed-in users to My Villas (the new homepage)
    redirect('/my-villas');
  } else {
    // Redirect non-signed-in users to sign-in
    redirect('/sign-in');
  }
  
  // This will never be reached due to redirects above
  return null;
}
