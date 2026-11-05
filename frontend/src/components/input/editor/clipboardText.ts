import type {Fragment, Node as ProseMirrorNode} from '@tiptap/pm/model'

function leafText(node: ProseMirrorNode): string {
	const fromSpec = node.type.spec.leafText?.(node)
	if (typeof fromSpec === 'string') {
		return fromSpec
	}
	return node.type.name === 'hardBreak' ? '\n' : ''
}

function prefixLines(lines: string[], first: string, rest: string): string[] {
	if (lines.length === 0) {
		return [first.trimEnd()]
	}
	return lines.map((line, i) => (i === 0 ? first : rest) + line)
}

function serializeList(node: ProseMirrorNode): string[] {
	const name = node.type.name
	const start = typeof node.attrs.start === 'number' ? node.attrs.start : 1
	const lines: string[] = []
	node.forEach((item, _offset, index) => {
		let marker = '- '
		if (name === 'orderedList') {
			marker = `${start + index}. `
		} else if (name === 'taskList' || item.type.name === 'taskItem') {
			marker = item.attrs.checked ? '- [x] ' : '- [ ] '
		}
		lines.push(...prefixLines(serializeFragment(item.content), marker, ' '.repeat(marker.length)))
	})
	return lines
}

function serializeNode(node: ProseMirrorNode): string[] {
	if (node.isTextblock) {
		return node.textBetween(0, node.content.size, undefined, leafText).split('\n')
	}
	if (node.isLeaf) {
		return node.isInline ? [leafText(node)] : leafText(node).split('\n')
	}
	switch (node.type.name) {
		case 'bulletList':
		case 'orderedList':
		case 'taskList':
			return serializeList(node)
		case 'blockquote':
			return serializeFragment(node.content).map(line => ('> ' + line).trimEnd())
		default:
			return serializeFragment(node.content)
	}
}

function serializeFragment(fragment: Fragment): string[] {
	if (fragment.childCount === 0) {
		return []
	}
	if (fragment.firstChild!.isInline) {
		return fragment.textBetween(0, fragment.size, undefined, leafText).split('\n')
	}
	const lines: string[] = []
	fragment.forEach(child => {
		lines.push(...serializeNode(child))
	})
	return lines
}

/**
 * Plain text representation of copied editor content. Unlike ProseMirror's default
 * (plain textBetween) this keeps list markers, checkboxes and quote prefixes so the
 * structure survives when pasting into a plain text target.
 */
export function serializeClipboardText(fragment: Fragment): string {
	return serializeFragment(fragment).join('\n')
}
