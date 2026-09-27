import type { Metadata } from 'next';
import './globals.css';
import {CaseProvider,Shell} from './components/core';
export const metadata: Metadata = {title:{default:'BugProof — Break it. Understand it. Prove the fix.',template:'%s · BugProof'},description:'An interactive bug investigation lab. Bring a test input, replay a real failure, and verify the IBM Bob-assisted repair with evidence.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><CaseProvider><Shell>{children}</Shell></CaseProvider></body></html>}
