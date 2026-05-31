#!/usr/bin/env node

const fs = require('node:fs/promises');
const path = require('node:path');

const FEED_URL = 'https://medium.com/feed/@saivivekvenna';
const ROOT = path.resolve(__dirname, '..');
const ARTICLE_DIR = path.join(ROOT, 'writing');
const ASSET_DIR = path.join(ROOT, 'writing-assets');
const REQUEST_TIMEOUT_MS = 30000;

const MONTH_FORMATTER = new Intl.DateTimeFormat('en', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
});

function decodeXml(value) {
    return value
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&apos;/g, "'");
}

function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function extractTag(block, tag) {
    const match = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`));
    return match ? decodeXml(match[1].trim()) : '';
}

function slugFromLink(link) {
    const lastPathPart = new URL(link).pathname.split('/').filter(Boolean).pop() || 'article';
    return lastPathPart.replace(/-[a-f0-9]{12}$/i, '');
}

function extensionFromUrl(url) {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase();
    return ext && ext.length <= 5 ? ext : '.jpg';
}

function getArticleId(itemBlock) {
    const guid = extractTag(itemBlock, 'guid');
    return guid.split('/').pop() || '';
}

function parseFeed(xml) {
    const itemBlocks = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(match => match[1]);

    return itemBlocks.map(itemBlock => {
        const title = extractTag(itemBlock, 'title');
        const link = extractTag(itemBlock, 'link').replace(/\?source=.*$/, '');
        const pubDate = new Date(extractTag(itemBlock, 'pubDate'));
        const contentMatch = itemBlock.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
        const content = contentMatch ? contentMatch[1].trim() : '';

        return {
            title,
            link,
            pubDate,
            dateLabel: MONTH_FORMATTER.format(pubDate),
            year: String(pubDate.getUTCFullYear()),
            slug: slugFromLink(link),
            articleId: getArticleId(itemBlock),
            content,
        };
    });
}

async function downloadImage(url, destination) {
    const response = await fetch(url, {
        headers: {
            'user-agent': 'saivenna-com-medium-importer',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
        throw new Error(`Could not download ${url}: ${response.status}`);
    }

    const data = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(destination, data);
}

async function localizeImages(article) {
    let imageIndex = 0;
    const imageUrls = [];
    const html = article.content.replace(/<img([^>]*?)src="([^"]+)"([^>]*?)>/g, (match, before, url, after) => {
        if (url.includes('medium.com/_/stat')) return '';

        imageIndex += 1;
        const ext = extensionFromUrl(url);
        const fileName = `image-${String(imageIndex).padStart(2, '0')}${ext}`;
        const relativePath = `../writing-assets/${article.slug}/${fileName}`;
        imageUrls.push({ url, fileName });
        const trailingAttributes = after.replace(/\s*\/\s*$/, '');

        return `<img${before}src="${relativePath}"${trailingAttributes} loading="lazy">`;
    });

    const articleAssetDir = path.join(ASSET_DIR, article.slug);
    await fs.mkdir(articleAssetDir, { recursive: true });

    for (const image of imageUrls) {
        console.log(`  image ${image.fileName}`);
        await downloadImage(image.url, path.join(articleAssetDir, image.fileName));
    }

    return html;
}

function localizeArticleLinks(content, articlesBySlug) {
    return content.replace(/href="([^"]+)"/g, (match, href) => {
        let url;

        try {
            url = new URL(href);
        } catch {
            return match;
        }

        if (url.hostname !== 'medium.com' || !url.pathname.startsWith('/@saivivekvenna/')) {
            return match;
        }

        const slug = slugFromLink(url.href);

        if (!articlesBySlug.has(slug)) {
            return match;
        }

        return `href="${slug}.html"`;
    });
}

function articleTemplate(article, content) {
    const title = escapeHtml(article.title);
    const dateLabel = escapeHtml(article.dateLabel);
    const mediumUrl = escapeHtml(article.link);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - sai venna</title>
    <link rel="icon" type="image/png" href="../tab_icon.png">
    <link rel="apple-touch-icon" href="../apple-touch-icon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link
        href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap"
        rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @keyframes page-dissolve-in {
            from {
                opacity: 0;
                filter: blur(4px);
            }

            to {
                opacity: 1;
                filter: blur(0);
            }
        }

        .page-content {
            transition: opacity 0.24s ease, filter 0.24s ease;
            will-change: opacity, filter;
        }

        body:not(.is-leaving) .page-content {
            animation: page-dissolve-in 0.38s ease-out both;
        }

        body.is-leaving .page-content {
            opacity: 0;
            filter: blur(4px);
        }

        nav,
        body.is-leaving nav {
            opacity: 1;
            filter: none;
            transform: none;
            animation: none;
        }

        @media (prefers-reduced-motion: reduce) {
            body:not(.is-leaving) .page-content {
                animation: none;
                transition: none;
                filter: none;
            }
        }

        body {
            background-color: #fbf7ee;
            color: #000000;
            font-family: 'Fira Code', 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
        }

        a { color: inherit; }

        .text-black { color: #000000 !important; }
        .text-neutral-600 { color: #525252 !important; }
        .bg-\\[\\#d8cfbf\\] { background-color: #d8cfbf !important; }

        .nav-link:hover {
            color: #000000;
            text-decoration: underline;
        }

        .article-layout {
            display: flex;
            flex-direction: column;
        }

        @media (min-width: 768px) {
            .article-layout {
                display: block;
            }

            .article-layout > nav {
                left: 3.5rem;
                position: fixed;
                top: 3.5rem;
                z-index: 10;
            }

            .nav-rail {
                background-color: #d8cfbf;
                bottom: 3.5rem;
                left: 11rem;
                position: fixed;
                top: 3.5rem;
                width: 1px;
            }
        }

        .article-kicker {
            color: #a89c84;
            font-size: 0.7rem;
            margin-bottom: 0.7rem;
            text-align: center;
        }

        .article-title {
            font-size: clamp(1.35rem, 4vw, 2.3rem);
            line-height: 1.15;
            letter-spacing: 0;
            margin-bottom: 0.85rem;
            text-align: center;
        }

        .article-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.6rem;
            justify-content: center;
            margin: 1.4rem 0 2.2rem;
        }

        .article-back-row {
            margin-bottom: 1.15rem;
        }

        .article-link,
        .article-back {
            color: #4f4638;
            display: inline-flex;
            font-size: 0.75rem;
            line-height: 1.4;
            text-decoration: none;
            transition: border-color 0.18s ease, color 0.18s ease;
        }

        .article-link,
        .article-back {
            border-bottom: 1px dotted #bfb29b;
        }

        .article-link:hover,
        .article-back:hover {
            border-bottom-style: solid;
            color: #000000;
        }

        .article-body {
            color: #211f1b;
            font-size: 0.9rem;
            line-height: 1.85;
            margin-left: auto;
            margin-right: auto;
            max-width: 46rem;
            text-align: left;
        }

        .article-body > * + * {
            margin-top: 1.1rem;
        }

        .article-body h3,
        .article-body h4 {
            color: #000000;
            font-weight: 600;
            line-height: 1.35;
            margin-top: 2.1rem;
        }

        .article-body h3 {
            font-size: 1.05rem;
        }

        .article-body h4 {
            font-size: 0.95rem;
        }

        .article-body a {
            border-bottom: 1px dotted #8e826d;
            color: #000000;
            text-decoration: none;
        }

        .article-body a:hover {
            border-bottom-style: solid;
        }

        .article-body strong {
            font-weight: 600;
        }

        .article-body ul,
        .article-body ol {
            padding-left: 1.25rem;
        }

        .article-body ul {
            list-style: disc;
        }

        .article-body ol {
            list-style: decimal;
        }

        .article-body li + li {
            margin-top: 0.45rem;
        }

        .article-body figure {
            margin: 1.6rem auto;
        }

        .article-body img {
            background: #efe6d5;
            border: 1px solid #e6dcc9;
            border-radius: 6px;
            display: block;
            height: auto;
            margin-left: auto;
            margin-right: auto;
            max-width: 100%;
        }

        .article-body figcaption {
            color: #7b705f;
            font-size: 0.72rem;
            line-height: 1.5;
            margin-top: 0.55rem;
        }

        .article-body blockquote {
            border-left: 1px solid #d8cfbf;
            color: #5d554a;
            padding-left: 1rem;
        }

        .article-body pre {
            background: #fffdf7;
            border: 1px solid #e6dcc9;
            border-radius: 6px;
            color: #211f1b;
            font-size: 0.72rem;
            line-height: 1.55;
            overflow-x: auto;
            padding: 1rem;
            white-space: pre-wrap;
        }

        @media (max-width: 767px) {
            .article-body {
                font-size: 0.86rem;
            }
        }
    </style>
</head>
<body class="w-full p-6 sm:p-10 md:p-14 text-xs sm:text-[13px] md:text-sm leading-5 sm:leading-6 md:leading-6 antialiased">
    <div class="article-layout">
        <nav class="md:mr-14 w-full md:w-16 text-right">
            <ul class="lowercase md:sticky md:top-10 flex flex-row flex-wrap justify-end gap-2 mb-6 md:mb-0 md:w-full md:flex-col md:justify-start md:items-end">
                <li class="text-black -mx-2 text-right">
                    <a class="nav-link inline-block w-full text-right px-2 transition-colors" href="../index.html">Home</a>
                </li>
                <li class="text-black -mx-2 text-right">
                    <a class="nav-link inline-block w-full text-right px-2 transition-colors" href="../projects.html">Projects</a>
                </li>
                <li class="text-black font-semibold -mx-2 text-right">
                    <a class="nav-link inline-block w-full text-right px-2 transition-colors" href="../writing.html">Writing</a>
                </li>
            </ul>
        </nav>
        <div class="nav-rail hidden md:block"></div>

        <main class="relative w-full page-content fade-in">
            <article class="relative w-full max-w-3xl mx-auto pt-6 md:pt-0">
                <div class="article-back-row">
                    <a class="article-back nav-link" href="../writing.html">Back</a>
                </div>
                <p class="article-kicker">${dateLabel}</p>
                <h1 class="article-title font-semibold text-black text-balance">${title}</h1>
                <div class="article-actions">
                    <a class="article-link" href="${mediumUrl}" target="_blank" rel="noopener noreferrer">Read in Medium</a>
                </div>

                <div class="article-body">
${content}
                </div>
            </article>
        </main>
    </div>

    <script src="../page-transition.js"></script>
</body>
</html>
`;
}

async function writeArticle(article, articlesBySlug) {
    const contentWithLocalImages = await localizeImages(article);
    const content = localizeArticleLinks(contentWithLocalImages, articlesBySlug);
    const outputPath = path.join(ARTICLE_DIR, `${article.slug}.html`);
    await fs.writeFile(outputPath, articleTemplate(article, content), 'utf8');
    return outputPath;
}

async function main() {
    await fs.mkdir(ARTICLE_DIR, { recursive: true });
    await fs.mkdir(ASSET_DIR, { recursive: true });

    const response = await fetch(FEED_URL, {
        headers: {
            'user-agent': 'saivenna-com-medium-importer',
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
        throw new Error(`Could not fetch Medium RSS: ${response.status}`);
    }

    const articles = parseFeed(await response.text());
    const articlesBySlug = new Map(articles.map(article => [article.slug, article]));
    const written = [];

    for (const article of articles) {
        console.log(`Importing ${article.slug}`);
        written.push(await writeArticle(article, articlesBySlug));
    }

    console.log(`Imported ${written.length} Medium articles:`);
    for (const file of written) {
        console.log(`- ${path.relative(ROOT, file)}`);
    }
}

main().catch(error => {
    console.error(error.message);
    process.exit(1);
});
