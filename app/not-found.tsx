import Link from 'next/link';
import {Bug,Icon} from './components/core';
export default function NotFound(){return <div className="not-found"><Bug mood="oops"/><p className="eyebrow">404 / A MISSING CLUE</p><h1>This trail went cold.</h1><p>That page doesn’t exist. A fresh investigation is waiting in the lab.</p><Link href="/missions" className="button primary">Back to the missions <Icon/></Link></div>}
