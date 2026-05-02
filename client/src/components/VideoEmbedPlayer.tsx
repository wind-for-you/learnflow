import { useMemo, useState } from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { isLikelyMobileSafari, toVideoIframeSrc } from '../utils/videoEmbedSrc';

interface VideoEmbedPlayerProps {
  pageUrl: string;
  title?: string | null;
}

export default function VideoEmbedPlayer({ pageUrl, title }: VideoEmbedPlayerProps) {
  const [iframeBroken, setIframeBroken] = useState(false);
  const src = useMemo(() => toVideoIframeSrc(pageUrl), [pageUrl]);
  const showOpenHint = isLikelyMobileSafari() || iframeBroken;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-black/5 dark:bg-black/20">
      <div className="aspect-video w-full relative bg-black">
        {!iframeBroken ? (
          <iframe
            title={title || '嵌入视频'}
            src={src}
            className="absolute inset-0 h-full w-full"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
            onError={() => setIframeBroken(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center text-sm text-gray-200">
            <p>当前环境无法嵌入播放，请在浏览器中打开原链接。</p>
            <a
              href={pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white font-medium hover:bg-primary-500"
            >
              <ArrowTopRightOnSquareIcon className="h-5 w-5" />
              打开原页面
            </a>
          </div>
        )}
      </div>
      {showOpenHint && !iframeBroken && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs text-gray-600 dark:text-gray-400 bg-amber-50/80 dark:bg-amber-950/30 border-t border-amber-200/60 dark:border-amber-800/50">
          <span>移动端可能限制内嵌播放，若画面空白请点击右侧在原站观看。</span>
          <a
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1 text-amber-800 dark:text-amber-200 font-medium hover:underline"
          >
            原站打开
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        </div>
      )}
      <p className="px-3 py-2 text-[11px] text-gray-500 dark:text-gray-500 leading-relaxed border-t border-gray-200/80 dark:border-gray-700/80">
        外链内容由第三方平台提供，版权归原平台及上传者所有；请遵守原平台服务条款与版权规则。
      </p>
    </div>
  );
}
