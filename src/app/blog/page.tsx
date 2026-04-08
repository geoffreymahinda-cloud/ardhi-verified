import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog \u2014 Ardhi Verified",
  description:
    "Land intelligence insights, guides and analysis for diaspora buyers investing in Kenya.",
};

const posts = [
  {
    slug: "the-map-that-stops-land-fraud",
    title:
      "The Map That Stops Land Fraud \u2014 And Why Sellers Don\u2019t Want You to Know About It",
    excerpt:
      "How Registry Index Maps, mutation forms, and court records protect diaspora land buyers in Kenya.",
    author: "Geoffrey Mahinda",
    date: "April 2026",
    readTime: "7 min read",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-bg">
      <div className="bg-navy px-4 pb-12 pt-20 sm:pb-16 sm:pt-28">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-serif text-3xl font-bold text-white sm:text-4xl">
            Blog
          </h1>
          <p className="mt-2 text-white/50">
            Land intelligence insights for diaspora buyers
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="space-y-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <h2 className="font-serif text-xl font-bold text-navy group-hover:text-ardhi transition-colors sm:text-2xl">
                {post.title}
              </h2>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                {post.excerpt}
              </p>
              <div className="mt-4 flex items-center gap-3 text-xs text-muted">
                <span className="font-medium text-navy">{post.author}</span>
                <span>&middot;</span>
                <span>{post.date}</span>
                <span>&middot;</span>
                <span>{post.readTime}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
