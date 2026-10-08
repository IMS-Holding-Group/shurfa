// محوّل Markdown في الخادم: يمرر أصل التخزين للمحوّل المشترك لفحص الصور
import { renderMarkdown as shared, firstParagraph } from '../../assets/js/shared/markdown.js';
import { storageOrigin } from '../cms/urls.js';

export { firstParagraph };

export function renderMarkdown(source) {
 return shared(source, { storageOrigin: storageOrigin() });
}
