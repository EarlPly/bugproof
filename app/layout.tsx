import type { Metadata } from 'next';
import './globals.css';
import {CaseProvider,Shell} from './components/core';
export const metadata: Metadata = {title:{default:'BugProof — Turn API failures into regression tests',template:'%s · BugProof'},description:'Compare API responses, create a regression test, and prepare a focused IBM Bob task. Explore a complete repair with real test evidence.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><CaseProvider><Shell>{children}</Shell></CaseProvider></body></html>}
