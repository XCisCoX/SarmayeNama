import Link from 'next/link';
import { getDictionary } from '@sarmaye/shared';

export default function NotFound() {
  const dict = getDictionary('fa');
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <p className="text-5xl font-bold text-primary">۴۰۴</p>
      <h1 className="text-lg font-semibold text-text">{dict.searchNoResults}</h1>
      <Link href="/" className="btn btn-primary">
        {dict.navHome}
      </Link>
    </div>
  );
}
