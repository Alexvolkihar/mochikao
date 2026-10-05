import type { Component } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';
import type { MochikaoOptions } from 'mochikao';

export type MochikaoProps = Omit<MochikaoOptions, 'gaze'> &
  Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> & {
    /** Force le SVG en ligne même sans animation. */
    inline?: boolean;
  };

/** <Mochikao name="alex" size={48} animate="hover" /> */
declare const Mochikao: Component<MochikaoProps>;
export default Mochikao;
