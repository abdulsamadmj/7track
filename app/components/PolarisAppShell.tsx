import { AppProvider, type AppProviderProps } from "@shopify/polaris";
import en from "@shopify/polaris/locales/en.json";
import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";
import { Link } from "react-router";

import "@shopify/polaris/build/esm/styles.css";

type PolarisLinkProps = {
  url: string;
  children?: ReactNode;
  external?: boolean;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

const PolarisLink = forwardRef<HTMLAnchorElement, PolarisLinkProps>(
  function PolarisLink({ url, external, children, ...rest }, ref) {
    if (external) {
      return (
        <a
          ref={ref}
          href={url}
          rel="noopener noreferrer"
          target="_blank"
          {...rest}
        >
          {children}
        </a>
      );
    }

    return (
      <Link ref={ref} to={url} {...rest}>
        {children}
      </Link>
    );
  },
);

PolarisLink.displayName = "PolarisLink";

export function PolarisAppShell({ children }: { children: ReactNode }) {
  return (
    <AppProvider
      i18n={en}
      linkComponent={
        PolarisLink as NonNullable<AppProviderProps["linkComponent"]>
      }
    >
      {children}
    </AppProvider>
  );
}
