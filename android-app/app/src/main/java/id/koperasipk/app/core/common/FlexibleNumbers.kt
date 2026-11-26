package id.koperasipk.app.core.common

import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.KSerializer
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder
import kotlinx.serialization.json.JsonDecoder
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.longOrNull

/**
 * Helper parsing numerik & boolean yang toleran terhadap respons Laravel/MySQL/SQLite
 * (misalnya angka desimal dikirim sebagai string "25000.00" atau boolean sebagai 0/1).
 */
fun String?.toFlexibleDouble(default: Double = 0.0): Double {
    val trimmed = this?.trim()?.takeIf { it.isNotEmpty() } ?: return default
    return trimmed.toDoubleOrNull() ?: default
}

fun String?.toFlexibleInt(default: Int = 0): Int {
    val trimmed = this?.trim()?.takeIf { it.isNotEmpty() } ?: return default
    return trimmed.toIntOrNull() ?: trimmed.toDoubleOrNull()?.toInt() ?: default
}

fun String?.toFlexibleLong(default: Long = 0L): Long {
    val trimmed = this?.trim()?.takeIf { it.isNotEmpty() } ?: return default
    return trimmed.toLongOrNull() ?: trimmed.toDoubleOrNull()?.toLong() ?: default
}

fun JsonElement?.asFlexibleDouble(default: Double = 0.0): Double {
    val primitive = this as? JsonPrimitive ?: return default
    if (primitive is JsonNull) return default
    return primitive.doubleOrNull ?: primitive.contentOrNull.toFlexibleDouble(default)
}

fun JsonElement?.asFlexibleInt(default: Int = 0): Int {
    val primitive = this as? JsonPrimitive ?: return default
    if (primitive is JsonNull) return default
    return primitive.intOrNull ?: primitive.contentOrNull.toFlexibleInt(default)
}

fun JsonElement?.asFlexibleLong(default: Long = 0L): Long {
    val primitive = this as? JsonPrimitive ?: return default
    if (primitive is JsonNull) return default
    return primitive.longOrNull ?: primitive.contentOrNull.toFlexibleLong(default)
}

fun JsonElement?.asFlexibleBoolean(default: Boolean = false): Boolean {
    val primitive = this as? JsonPrimitive ?: return default
    if (primitive is JsonNull) return default
    primitive.booleanOrNull?.let { return it }
    primitive.intOrNull?.let { return it != 0 }
    return when (primitive.contentOrNull?.trim()?.lowercase()) {
        "true", "1", "yes", "ya" -> true
        "false", "0", "no", "tidak", "" -> false
        else -> default
    }
}

object FlexibleDoubleSerializer : KSerializer<Double> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("FlexibleDouble", PrimitiveKind.DOUBLE)

    override fun deserialize(decoder: Decoder): Double {
        return if (decoder is JsonDecoder) {
            decoder.decodeJsonElement().asFlexibleDouble(0.0)
        } else {
            decoder.decodeDouble()
        }
    }

    override fun serialize(encoder: Encoder, value: Double) {
        encoder.encodeDouble(value)
    }
}

object FlexibleNullableDoubleSerializer : KSerializer<Double?> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("FlexibleNullableDouble", PrimitiveKind.DOUBLE)

    override fun deserialize(decoder: Decoder): Double? {
        return if (decoder is JsonDecoder) {
            val element = decoder.decodeJsonElement()
            if (element is JsonNull) null else element.asFlexibleDouble(0.0)
        } else {
            decoder.decodeDouble()
        }
    }

    @OptIn(ExperimentalSerializationApi::class)
    override fun serialize(encoder: Encoder, value: Double?) {
        if (value == null) encoder.encodeNull() else encoder.encodeDouble(value)
    }
}

object FlexibleNullableIntSerializer : KSerializer<Int?> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("FlexibleNullableInt", PrimitiveKind.INT)

    override fun deserialize(decoder: Decoder): Int? {
        return if (decoder is JsonDecoder) {
            val element = decoder.decodeJsonElement()
            if (element is JsonNull) null else element.asFlexibleInt(0)
        } else {
            decoder.decodeInt()
        }
    }

    @OptIn(ExperimentalSerializationApi::class)
    override fun serialize(encoder: Encoder, value: Int?) {
        if (value == null) encoder.encodeNull() else encoder.encodeInt(value)
    }
}

object FlexibleIntSerializer : KSerializer<Int> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("FlexibleInt", PrimitiveKind.INT)

    override fun deserialize(decoder: Decoder): Int {
        return if (decoder is JsonDecoder) {
            decoder.decodeJsonElement().asFlexibleInt(0)
        } else {
            decoder.decodeInt()
        }
    }

    override fun serialize(encoder: Encoder, value: Int) {
        encoder.encodeInt(value)
    }
}

object FlexibleLongSerializer : KSerializer<Long> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("FlexibleLong", PrimitiveKind.LONG)

    override fun deserialize(decoder: Decoder): Long {
        return if (decoder is JsonDecoder) {
            decoder.decodeJsonElement().asFlexibleLong(0L)
        } else {
            decoder.decodeLong()
        }
    }

    override fun serialize(encoder: Encoder, value: Long) {
        encoder.encodeLong(value)
    }
}

object FlexibleBooleanSerializer : KSerializer<Boolean> {
    override val descriptor: SerialDescriptor =
        PrimitiveSerialDescriptor("FlexibleBoolean", PrimitiveKind.BOOLEAN)

    override fun deserialize(decoder: Decoder): Boolean {
        return if (decoder is JsonDecoder) {
            decoder.decodeJsonElement().asFlexibleBoolean(false)
        } else {
            decoder.decodeBoolean()
        }
    }

    override fun serialize(encoder: Encoder, value: Boolean) {
        encoder.encodeBoolean(value)
    }
}
