import { DocsPage, DocsBody } from 'fumadocs-ui/page';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { Callout } from 'fumadocs-ui/components/callout';
import { Tabs, Tab } from 'fumadocs-ui/components/tabs';
import { TypeTable } from 'fumadocs-ui/components/type-table';
import { Steps, Step } from 'fumadocs-ui/components/steps';
import { notFound } from 'next/navigation';
import { getPages, getPage } from '@/lib/source';
import { CodeGroup } from '@/components/CodeGroup';
import { ComponentPreview } from '@/components/ComponentPreview';
import { CopyCommandButton } from '@/components/CopyCommandButton';
import * as Demos from '@/components/demos';

const mdxComponents = {
  ...defaultMdxComponents,
  // Explicit overrides / extras
  Card,
  Cards,
  Callout,
  Tabs,
  Tab,
  TypeTable,
  Steps,
  Step,
  CodeGroup,
  ComponentPreview,
  CopyCommandButton,
  ...Demos,
};

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const page = getPage(slug);

  if (!page) {
    notFound();
  }

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsBody>
        <h1>{page.data.title}</h1>
        <MDX components={mdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return getPages().map((page: { slugs: string[] }) => ({
    slug: page.slugs,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const page = getPage(slug);

  if (!page) {
    return {};
  }

  return {
    title: page.data.title,
    description: page.data.description,
  };
}
