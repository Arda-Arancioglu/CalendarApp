import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button, type ButtonProps } from './Button';
import { useToast } from '../../hooks/useToast';

interface CopyButtonProps extends Omit<ButtonProps, 'onClick'> {
  value: string;
  label?: string;
  copiedLabel?: string;
}

/**
 * Button that copies `value` to the clipboard and briefly switches to a "Copied" state.
 */
export function CopyButton({
  value,
  label = 'Copy',
  copiedLabel = 'Copied',
  variant = 'secondary',
  size = 'sm',
  ...props
}: CopyButtonProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => void handleCopy()}
      leftIcon={
        copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )
      }
      {...props}
    >
      {copied ? copiedLabel : label}
    </Button>
  );
}
