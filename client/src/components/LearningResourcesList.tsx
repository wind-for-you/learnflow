import {
  BookOpenIcon,
  FilmIcon,
  LinkIcon,
  PuzzlePieceIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import type { LearningResource } from '../types';

const TYPE_META: Record<
  LearningResource['type'],
  { label: string; Icon: typeof BookOpenIcon }
> = {
  book: { label: '书籍', Icon: BookOpenIcon },
  article: { label: '文章', Icon: DocumentTextIcon },
  video: { label: '视频', Icon: FilmIcon },
  project: { label: '项目', Icon: PuzzlePieceIcon },
  other: { label: '资源', Icon: LinkIcon },
};

function toHref(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

interface Props {
  resources?: LearningResource[];
  title?: string;
  compact?: boolean;
}

export default function LearningResourcesList({
  resources,
  title = '学习资源',
  compact = false,
}: Props) {
  if (!resources || resources.length === 0) return null;

  return (
    <div className={compact ? 'mt-2' : 'mt-3'}>
      <h4
        className={`font-medium text-gray-900 dark:text-white mb-2 ${
          compact ? 'text-xs' : 'text-sm'
        }`}
      >
        {title}
      </h4>
      <ul className="space-y-2">
        {resources.map((resource, index) => {
          const meta = TYPE_META[resource.type] || TYPE_META.other;
          const Icon = meta.Icon;
          return (
            <li
              key={`${resource.title}-${index}`}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-3 py-2"
            >
              <a
                href={toHref(resource.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-2"
              >
                <Icon className="h-4 w-4 mt-0.5 text-primary-600 dark:text-primary-400 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-primary-700 dark:text-primary-300 group-hover:underline">
                    [{meta.label}] {resource.title}
                  </span>
                  {resource.description && (
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {resource.description}
                    </span>
                  )}
                </span>
                <LinkIcon className="h-3.5 w-3.5 mt-1 text-gray-400 shrink-0 opacity-0 group-hover:opacity-100" />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
