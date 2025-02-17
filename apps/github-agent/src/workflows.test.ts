import { expect, test } from 'vitest';
import { extractStudioUiUrl } from './workflows';

test('Extract Studio URL', async () => {
    const url = extractStudioUiUrl(`
[vc]: #xxx
**The latest updates on your projects**. Learn more about [Vercel for Git ↗︎](https://vercel.link/github-learn-more)

| Name | Status | Preview | Comments | Updated (UTC) |
| :--- | :----- | :------ | :------- | :------ |
| **docs** | ✅ Ready ([Inspect](https://vercel.com/vertesia/docs/2uSuppPr2bWNDTkuS8vZ9KTjyQ34)) | [Visit Preview](https://docs-git-feat-github.vertesia.dev) | 💬 [**Add feedback**](https://vercel.live/open-feedback/docs-git-feat-github.vertesia.dev?via=pr-comment-feedback-link) | Feb 17, 2025 1:37pm |
| **unified** | 🔄 Building ([Inspect](https://vercel.com/vertesia/unified/GNuMpMv6dzZDuzfbcdJ7NqcMMW6m)) | [Visit Preview](https://unified-git-feat-github.vertesia.dev) | 💬 [**Add feedback**](https://vercel.live/open-feedback/unified-git-feat-github.vertesia.dev?via=pr-comment-feedback-link) | Feb 17, 2025 1:37pm |

<details><summary>1 Skipped Deployment</summary>

| Name | Status | Preview | Comments | Updated (UTC) |
| :--- | :----- | :------ | :------- | :------ |
| **internal-auth** | ⬜️ Skipped ([Inspect](https://vercel.com/vertesia/internal-auth/BFpp12Eui37u6QWSThNTZ9TiVXR4)) |  |  | Feb 17, 2025 1:37pm |
</details>



`);
    expect(url).toEqual('https://unified-git-feat-github.vertesia.dev');
});