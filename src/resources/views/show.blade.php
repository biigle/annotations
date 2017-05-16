@extends('app')
@inject('modules', 'Biigle\Services\Modules')

@section('title') Annotate {{$image->filename}} @stop

@push('scripts')
<script src="{{ cachebust_asset('vendor/label-trees/scripts/main.js') }}"></script>
<script src="{{ cachebust_asset('vendor/volumes/scripts/main.js') }}"></script>
<script src="{{ cachebust_asset('vendor/annotations/scripts/ol.js') }}"></script>
<script src="{{ cachebust_asset('vendor/annotations/scripts/glfx.js') }}"></script>
<script src="{{ cachebust_asset('vendor/annotations/scripts/vue.js') }}"></script>
<script type="text/javascript">
    @can('add-annotation', $image)
        biigle.$declare('annotations.labelTrees', {!! $labelTrees !!});
    @endcan
    biigle.$declare('annotations.imageId', {!! $image->id !!});
    biigle.$declare('annotations.volumeId', {!! $image->volume_id !!});
    biigle.$declare('annotations.shapes', {!! $shapes !!});
    biigle.$declare('annotations.imagesIds', {!! $images->keys() !!});
    biigle.$declare('annotations.imagesFilenames', {!! $images->values() !!});
    biigle.$declare('annotations.imageFileUri', '{!! url('api/v1/images/{id}/file') !!}');
    biigle.$declare('annotations.sessions', {!!$annotationSessions!!});
    biigle.$declare('annotations.volumeIsRemote', @if($volume->isRemote()) true @else false @endif);
    biigle.$declare('annotations.isEditor', @can('add-annotation', $image) true @else false @endcan);

</script>
{{--TODO:@foreach ($modules->getMixins('annotationsScripts') as $module => $nestedMixins)
    @include($module.'::annotationsScripts', ['mixins' => $nestedMixins])
@endforeach--}}
@endpush

@push('styles')
<link href="{{ cachebust_asset('vendor/label-trees/styles/main.css') }}" rel="stylesheet">
<link href="{{ cachebust_asset('vendor/annotations/styles/ol.css') }}" rel="stylesheet">
<link href="{{ cachebust_asset('vendor/annotations/styles/vue.css') }}" rel="stylesheet">

@foreach ($modules->getMixins('annotationsStyles') as $module => $nestedMixins)
    @include($module.'::annotationsStyles', ['mixins' => $nestedMixins])
@endforeach
@endpush

@section('navbar')
<div class="navbar-text navbar-annotations-breadcrumbs">
    @include('volumes::partials.projectsBreadcrumb', ['projects' => $volume->projects])/ <a href="{{route('volume', $volume->id)}}" class="navbar-link" title="Show volume {{$volume->name}}">{{$volume->name}}</a>
    / <strong id="annotations-navbar" :title="currentImageFilename" v-text="currentImageFilename">{{$image->filename}}</strong> @include('volumes::partials.annotationSessionIndicator')
</div>
@endsection

@section('content')
<div id="annotator-container" class="annotator-container" v-cloak>
    <annotation-canvas
        :editable="isEditor"
        :loading="loading"
        :image="image"
        :annotations="filteredAnnotations"
        :selected-annotations="selectedAnnotations"
        :last-created-annotation="lastCreatedAnnotation"
        :center="mapCenter"
        :resolution="mapResolution"
        :selected-label="selectedLabel"
        :annotation-opacity="annotationOpacity"
        :cycle-mode="cycleMode"
        v-on:moveend="handleMapMoveend"
        v-on:previous="handlePrevious"
        v-on:next="handleNext"
        v-on:new="handleNewAnnotation"
        v-on:select="handleSelectAnnotations"
        v-on:update="handleUpdateAnnotations"
        v-on:attach="handleAttachLabel"
        v-on:delete="handleDeleteAnnotations"
        ref="canvas"
        v-cloak
        inline-template>
        @include('annotations::show.annotationCanvas')
    </annotation-canvas>
    <sidebar open-tab="settings">
        @include('annotations::show.tabs.annotations')
        @can('add-annotation', $image)
            @include('annotations::show.tabs.labels')
        @endcan
        @include('annotations::show.tabs.colorAdjustment')
        @include('annotations::show.tabs.settings')
    </sidebar>
</div>
@endsection
