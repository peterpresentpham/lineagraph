import type { ReactNode } from "react";

type Props = { children: ReactNode };

// Long-form text (about, policies): a readable column with spacing between blocks. Links inside are
// underlined, so they are not told apart from the text by colour alone.
export function Prose({ children }: Props) {
  return (
    <div className="max-w-prose-page [&_a]:underline [&_h2]:mb-3 [&_h2]:mt-10 [&_li]:mt-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mt-4 [&_p]:leading-relaxed [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
      {children}
    </div>
  );
}
