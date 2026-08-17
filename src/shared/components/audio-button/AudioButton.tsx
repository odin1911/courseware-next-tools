import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, MouseEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { createAudioManager } from '@/shared/components/audio-manager';
import { FrameAnimation } from '@/shared/components/frame-animation';
import audio_0 from '@/shared/assets/images/audio-button/audio_0.png';
import audio_1 from '@/shared/assets/images/audio-button/audio_1.png';
import audio_2 from '@/shared/assets/images/audio-button/audio_2.png';
import audio_3 from '@/shared/assets/images/audio-button/audio_3.png';
import audio_4 from '@/shared/assets/images/audio-button/audio_4.png';
import audio_5 from '@/shared/assets/images/audio-button/audio_5.png';

const AUDIO_FRAMES = [audio_0, audio_1, audio_2, audio_3, audio_4, audio_5];

export const AudioButtonStyled = styled.button`
  width: 100px;
  height: 100px;
  border: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  &:disabled {
    cursor: default;
    opacity: 0.82;
  }
`;

const AudioButtonFrame = styled(FrameAnimation)`
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
  pointer-events: none;
`;

export type AudioButtonIconProps = Omit<
  ComponentPropsWithoutRef<typeof FrameAnimation>,
  'frames' | 'idleFrameIndex' | 'startFrameIndex' | 'endFrameIndex' | 'frameDurationMs' | 'loop'
>;

export function AudioButtonIcon({ isPlaying = false, alt = '', ...props }: AudioButtonIconProps) {
  return (
    <AudioButtonFrame
      frames={AUDIO_FRAMES}
      isPlaying={isPlaying}
      idleFrameIndex={0}
      startFrameIndex={1}
      endFrameIndex={5}
      frameDurationMs={90}
      loop
      alt={alt}
      {...props}
    />
  );
}

export type AudioButtonViewProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  isPlaying?: boolean;
};

export function AudioButtonView({
  disabled = false,
  isPlaying = false,
  type = 'button',
  className,
  style,
  'aria-label': ariaLabel = 'play question audio',
  ...props
}: AudioButtonViewProps) {
  return (
    <AudioButtonStyled
      type={type}
      aria-label={ariaLabel}
      disabled={disabled}
      className={className}
      style={style}
      {...props}
    >
      <AudioButtonIcon isPlaying={isPlaying} alt="audio button" />
    </AudioButtonStyled>
  );
}

export type AudioButtonProps = Omit<AudioButtonViewProps, 'isPlaying'> & {
  src?: string;
  toggle?: boolean;
};

export default function AudioButton({
  disabled = false,
  src,
  toggle = false,
  type = 'button',
  className,
  style,
  onClick,
  'aria-label': ariaLabel = 'play question audio',
  ...props
}: AudioButtonProps) {
  const audioManagerRef = useRef(createAudioManager());
  const audioManager = audioManagerRef.current;
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const unsubscribe = audioManager.subscribe((snapshot) => {
      const activeSrc = snapshot.src[0] || '';
      setIsPlaying(snapshot.playing && Boolean(src) && activeSrc === src);
    });

    return () => {
      unsubscribe();
    };
  }, [audioManager, src]);

  useEffect(() => {
    if (!src) {
      audioManager.stop();
      setIsPlaying(false);
    }
  }, [audioManager, src]);

  useEffect(() => {
    return () => {
      audioManager.destroy();
    };
  }, [audioManager]);

  function handleClick(event: MouseEvent<HTMLButtonElement>): void {
    onClick?.(event);

    if (event.defaultPrevented) {
      return;
    }

    if (!src || disabled) {
      return;
    }

    if (toggle && isPlaying) {
      audioManager.stop();
      return;
    }

    audioManager.play({
      src,
      interrupt: true,
      html5: true,
    });
  }

  return src ? (
    <AudioButtonView
      type={type}
      className={className}
      style={style}
      disabled={disabled}
      isPlaying={isPlaying}
      aria-label={ariaLabel}
      onClick={handleClick}
      {...props}
    />
  ) : null;
}
