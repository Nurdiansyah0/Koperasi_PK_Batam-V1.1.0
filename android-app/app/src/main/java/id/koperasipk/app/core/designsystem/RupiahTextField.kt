package id.koperasipk.app.core.designsystem

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import id.koperasipk.app.core.common.CurrencyFormatter

@Composable
fun RupiahTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String = "0",
    errorMessage: String? = null,
    supportingText: String? = null,
    enabled: Boolean = true,
    readOnly: Boolean = false,
    imeAction: ImeAction = ImeAction.Done,
    onImeAction: (() -> Unit)? = null,
) {
    val transformation = remember { ThousandSeparatorTransformation() }

    OutlinedTextField(
        value = value,
        onValueChange = { input ->
            val digitsOnly = input.filter(Char::isDigit)
            onValueChange(digitsOnly)
        },
        label = { Text(label) },
        placeholder = { Text(placeholder) },
        prefix = {
            Text(
                text = "Rp ",
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        },
        isError = !errorMessage.isNullOrBlank(),
        supportingText = when {
            !errorMessage.isNullOrBlank() -> {
                { Text(text = errorMessage) }
            }
            !supportingText.isNullOrBlank() -> {
                { Text(text = supportingText) }
            }
            else -> null
        },
        singleLine = true,
        enabled = enabled,
        readOnly = readOnly,
        shape = RoundedCornerShape(14.dp),
        visualTransformation = transformation,
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Number,
            imeAction = imeAction,
        ),
        keyboardActions = KeyboardActions(
            onDone = { onImeAction?.invoke() },
            onNext = { onImeAction?.invoke() },
        ),
        modifier = modifier.fillMaxWidth(),
    )
}

private class ThousandSeparatorTransformation : VisualTransformation {
    override fun filter(text: AnnotatedString): TransformedText {
        val raw = text.text
        if (raw.isEmpty()) {
            return TransformedText(AnnotatedString(""), OffsetMapping.Identity)
        }
        val parsed = raw.toLongOrNull()
        val formatted = if (parsed != null) {
            CurrencyFormatter.formatPlain(parsed)
        } else {
            raw
        }

        val offsetMapping = object : OffsetMapping {
            override fun originalToTransformed(offset: Int): Int {
                val safeOffset = offset.coerceIn(0, raw.length)
                if (safeOffset == 0) return 0
                var digitsSeen = 0
                for (i in formatted.indices) {
                    if (formatted[i].isDigit()) {
                        digitsSeen++
                        if (digitsSeen == safeOffset) {
                            return i + 1
                        }
                    }
                }
                return formatted.length
            }

            override fun transformedToOriginal(offset: Int): Int {
                val safeOffset = offset.coerceIn(0, formatted.length)
                var digitsBefore = 0
                for (i in 0 until safeOffset) {
                    if (formatted[i].isDigit()) {
                        digitsBefore++
                    }
                }
                return digitsBefore.coerceIn(0, raw.length)
            }
        }

        return TransformedText(AnnotatedString(formatted), offsetMapping)
    }
}
