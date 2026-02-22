import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import logo from '../../assets/logo.png'

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="inline-flex items-center gap-2">
          <img src={logo} alt="" className="size-6" />
          <span>OpenClaw Swarm</span>
        </span>
      ),
    },
    githubUrl: 'https://github.com/kddige/openclaw-swarm',
  }
}
