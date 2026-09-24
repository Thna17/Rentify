import { Link } from 'react-router-dom';
import { useStorefrontAuth } from '../hooks/useStorefrontAuth';
import { hostedSignInUrl } from '../hostedBuyer';

export const HostedBuyerProfile = () => {
  const { profile, isAuthenticated, isLoading, logout } = useStorefrontAuth();
  return <main className="mx-auto max-w-2xl space-y-4 px-4 py-10">
    <h1 className="text-2xl font-semibold">My Rentify account</h1>
    {isLoading && <p>Loading account…</p>}
    {!isLoading && !isAuthenticated && <a className="underline" href={hostedSignInUrl()}>Sign in</a>}
    {isAuthenticated && <><p>{profile?.name}</p><p>{profile?.email || profile?.phoneNumber}</p>
      <Link className="inline-block underline" to="/orders">My orders</Link>
      <button type="button" className="ml-5 underline" onClick={logout}>Sign out</button></>}
  </main>;
};
